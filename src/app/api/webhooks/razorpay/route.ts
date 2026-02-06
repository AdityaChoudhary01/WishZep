import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';

/**
 * Path: /api/webhooks/razorpay
 * Protocol: Secure Server-to-Server Handshake with Firestore Data Enrichment
 */
export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret || !signature) {
      console.error('[Webhook] Security protocol missing');
      return NextResponse.json({ error: 'Security protocol missing' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[Webhook] Invalid Signature Detected');
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
    }

    const event = JSON.parse(payload);
    console.log(`[Webhook] Processing: ${event.event}`);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload.payment ? event.payload.payment.entity : event.payload.order.entity;
      const rzpOrderId = entity.order_id || entity.id;
      
      // 1. Fetch Order Data from Firestore for Email Enrichment
      const { firestore } = initializeFirebase();
      const ordersRef = collection(firestore, 'orders');
      const q = query(ordersRef, where('razorpayOrderId', '==', rzpOrderId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const orderDoc = querySnapshot.docs[0];
        const orderData = orderDoc.data();
        const itemsSnapshot = await getDocs(collection(firestore, 'orders', orderDoc.id, 'order_items'));
        const orderItems = itemsSnapshot.docs.map(d => d.data());

        // 2. Trigger High-Fidelity Dual Emails
        await sendDualAuthEmails(orderData.shippingDetails?.email || entity.email, orderDoc.id, orderData, orderItems);
        console.log(`[Webhook] Success: Enriched communications dispatched for Order: ${orderDoc.id}`);
      } else {
        console.warn(`[Webhook] Order ${rzpOrderId} not found in Firestore. Sending basic email.`);
        // Fallback to basic email if firestore sync is slow
        await sendDualAuthEmails(entity.email, rzpOrderId, { totalAmount: entity.amount / 100 }, []);
      }
    }

    return NextResponse.json({ status: 'processed', timestamp: Date.now() }, { status: 200 });

  } catch (err: any) {
    console.error('[Webhook] Critical Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Dispatches the Ultra-Modern Dark UI communication suite.
 */
async function sendDualAuthEmails(customerEmail: string, orderId: string, orderData: any, items: any[]) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials missing.');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(orderData.totalAmount || 0);

  // --- HTML COMPONENTS ---
  
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 20px 0; border-bottom: 1px solid #1a1a1a;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td width="70" valign="top">
              <img src="${item.image}" width="60" height="60" style="border-radius: 12px; object-fit: cover; background: #111;" />
            </td>
            <td style="padding-left: 15px;">
              <p style="margin: 0; font-size: 14px; font-weight: 900; color: #ffffff; text-transform: uppercase;">${item.name}</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #666; font-weight: bold; letter-spacing: 1px;">QTY: ${item.quantity} • UNIT PRICE: ₹${item.price.toLocaleString()}</p>
            </td>
            <td align="right" valign="top">
              <p style="margin: 0; font-size: 14px; font-weight: 900; color: #BE29EC;">₹${(item.price * item.quantity).toLocaleString()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  // --- 1. CUSTOMER EMAIL: THE "ULTRA-MODERN" FLIPKART KILLER ---
  const customerMailOptions = {
    from: `"WishZep Registry" <${smtpUser}>`,
    to: customerEmail,
    subject: `ORDER CONFIRMED: Protocol ${orderId.slice(-6).toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 40px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.5);">
                <!-- Header Gradient -->
                <tr><td height="8" style="background: linear-gradient(90deg, #BE29EC, #29A6EC, #BE29EC);"></td></tr>
                
                <tr>
                  <td style="padding: 50px 40px;">
                    <!-- Brand Section -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="background: linear-gradient(135deg, #BE29EC, #29A6EC); width: 50px; height: 50px; border-radius: 15px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; color: white;">W</div>
                        </td>
                        <td align="right">
                          <p style="margin: 0; font-size: 10px; font-weight: 900; color: #666; letter-spacing: 2px; text-transform: uppercase;">Authenticated Drop</p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 900; color: #ffffff;">CONFIRMED</p>
                        </td>
                      </tr>
                    </table>

                    <h1 style="font-size: 42px; font-weight: 900; letter-spacing: -2px; margin: 40px 0 10px 0; color: #ffffff; text-transform: uppercase; line-height: 1;">Order <br/><span style="color: #BE29EC;">Secured.</span></h1>
                    <p style="font-size: 15px; color: #888; line-height: 1.6; margin: 0 0 40px 0;">Hi ${orderData.shippingDetails?.fullName || 'Visionary'}, your artifacts have been logged into the WishZep global registry. The fulfillment engine is now active.</p>

                    <!-- Status Tracker -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 40px; background: #111; border-radius: 20px; padding: 20px;">
                      <tr>
                        <td align="center">
                          <div style="display: inline-block; width: 12px; height: 12px; background: #BE29EC; border-radius: 50%; box-shadow: 0 0 10px #BE29EC;"></div>
                          <p style="margin: 8px 0 0 0; font-size: 9px; font-weight: 900; color: #ffffff; text-transform: uppercase;">Placed</p>
                        </td>
                        <td height="2" style="background: #333; min-width: 40px;"></td>
                        <td align="center">
                          <div style="display: inline-block; width: 12px; height: 12px; background: #333; border-radius: 50%;"></div>
                          <p style="margin: 8px 0 0 0; font-size: 9px; font-weight: 900; color: #444; text-transform: uppercase;">Packed</p>
                        </td>
                        <td height="2" style="background: #333; min-width: 40px;"></td>
                        <td align="center">
                          <div style="display: inline-block; width: 12px; height: 12px; background: #333; border-radius: 50%;"></div>
                          <p style="margin: 8px 0 0 0; font-size: 9px; font-weight: 900; color: #444; text-transform: uppercase;">Shipped</p>
                        </td>
                        <td height="2" style="background: #333; min-width: 40px;"></td>
                        <td align="center">
                          <div style="display: inline-block; width: 12px; height: 12px; background: #333; border-radius: 50%;"></div>
                          <p style="margin: 8px 0 0 0; font-size: 9px; font-weight: 900; color: #444; text-transform: uppercase;">Delivered</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Items Section -->
                    <h3 style="font-size: 11px; font-weight: 900; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #1a1a1a; padding-bottom: 10px;">Itemized Manifest</h3>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      ${itemsHtml}
                    </table>

                    <!-- Summary Section -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 30px; background: #111; border-radius: 24px; padding: 25px;">
                      <tr>
                        <td style="padding-bottom: 10px; color: #666; font-size: 12px; font-weight: bold; text-transform: uppercase;">Subtotal</td>
                        <td align="right" style="padding-bottom: 10px; font-weight: 900; font-size: 14px;">${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px; color: #666; font-size: 12px; font-weight: bold; text-transform: uppercase;">Logistics</td>
                        <td align="right" style="padding-bottom: 10px; font-weight: 900; font-size: 14px; color: #00ff88;">FREE</td>
                      </tr>
                      <tr style="border-top: 1px solid #222;">
                        <td style="padding-top: 15px; color: #ffffff; font-size: 16px; font-weight: 900; text-transform: uppercase;">Authorized Total</td>
                        <td align="right" style="padding-top: 15px; font-weight: 900; font-size: 24px; color: #29A6EC;">${formattedAmount}</td>
                      </tr>
                    </table>

                    <!-- Shipping Coordinates -->
                    <div style="margin-top: 40px; padding: 25px; border: 1px solid #1a1a1a; border-radius: 24px;">
                      <p style="margin: 0 0 15px 0; font-size: 11px; font-weight: 900; color: #666; letter-spacing: 2px; text-transform: uppercase;">Destination Coordinates</p>
                      <p style="margin: 0; font-size: 14px; font-weight: 900; color: #ffffff;">${orderData.shippingDetails?.fullName || 'N/A'}</p>
                      <p style="margin: 5px 0 0 0; font-size: 13px; color: #888; line-height: 1.5;">${orderData.shippingAddress || 'Details pending registry sync.'}</p>
                      <p style="margin: 15px 0 0 0; font-size: 13px; font-weight: 900; color: #BE29EC;">${orderData.shippingDetails?.contactNumber || ''}</p>
                    </div>

                    <div style="margin-top: 50px; text-align: center;">
                      <a href="https://wishzep.shop/profile" style="background: linear-gradient(90deg, #BE29EC, #29A6EC); color: #ffffff; padding: 20px 40px; border-radius: 100px; text-decoration: none; font-weight: 900; font-size: 14px; letter-spacing: 1px; display: inline-block; box-shadow: 0 10px 30px rgba(190, 41, 236, 0.3);">VIEW ARTIFACT STATUS →</a>
                    </div>

                    <p style="margin-top: 60px; font-size: 10px; color: #333; text-align: center; line-height: 1.6; border-top: 1px solid #1a1a1a; padding-top: 30px;">
                      © 2026 WISHZEP REGISTRY. All transmissions are encrypted under Global Security Protocol v4.2. This is an automated artifact log.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  // --- 2. ADMIN ALERT: THE "DISPATCH CONSOLE" ---
  const adminMailOptions = {
    from: `"WishZep Alert" <${smtpUser}>`,
    to: smtpUser, 
    subject: `🚨 NEW DROP: ${formattedAmount} [${orderId.slice(-6).toUpperCase()}]`,
    html: `
      <div style="background: #000; color: #fff; padding: 40px; font-family: 'Courier New', monospace; border: 2px solid #BE29EC; border-radius: 24px; max-width: 600px; margin: auto;">
        <h2 style="color: #BE29EC; border-bottom: 1px solid #333; padding-bottom: 15px; margin-top: 0; font-size: 20px; font-weight: 900;">INBOUND SETTLEMENT DETECTED</h2>
        
        <table width="100%" style="color: #888; font-size: 13px; border-collapse: collapse; margin-bottom: 30px;">
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #111;">PROTOCOL_ID:</td><td style="color: #fff; text-align: right;">${orderId}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #111;">CUSTOMER_IDENTITY:</td><td style="color: #fff; text-align: right;">${customerEmail}</td></tr>
          <tr><td style="padding: 10px 0; border-bottom: 1px solid #111;">TOTAL_REVENUE:</td><td style="color: #00ff88; font-weight: bold; text-align: right; font-size: 18px;">${formattedAmount}</td></tr>
          <tr><td style="padding: 10px 0;">PAYMENT_GATEWAY:</td><td style="color: #29A6EC; text-align: right;">RAZORPAY_KERNEL_V2</td></tr>
        </table>

        <div style="background: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
          <p style="color: #BE29EC; font-weight: 900; font-size: 10px; margin: 0 0 10px 0; text-transform: uppercase;">Manifest Summary</p>
          ${items.map(i => `<p style="margin: 5px 0; font-size: 12px; color: #fff;">● ${i.name} (x${i.quantity})</p>`).join('')}
        </div>
        
        <div style="text-align: center;">
          <a href="https://wishzep.shop/admin/dashboard" 
             style="background: #BE29EC; color: #fff; padding: 20px 30px; text-decoration: none; border-radius: 15px; font-weight: bold; font-family: sans-serif; display: inline-block; box-shadow: 0 4px 25px rgba(190, 41, 236, 0.5);">
             INITIALIZE FULFILLMENT PROTOCOLS →
          </a>
        </div>
        <p style="margin-top: 40px; color: #444; font-size: 9px; text-align: center; letter-spacing: 1px;">SYSTEM_LOG: TRANSACTION_AUTHENTICATED_VIA_WEBHOOK</p>
      </div>
    `,
  };

  // Simultaneous Dispatch
  await Promise.all([
    transporter.sendMail(customerMailOptions),
    transporter.sendMail(adminMailOptions)
  ]);
}
