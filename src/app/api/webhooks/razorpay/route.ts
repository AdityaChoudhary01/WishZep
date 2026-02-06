import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { initializeFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

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
      console.error('[Webhook] Security credentials missing');
      return NextResponse.json({ error: 'Security credentials missing' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[Webhook] Invalid Signature');
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
    }

    const event = JSON.parse(payload);
    console.log(`[Webhook] Event Received: ${event.event}`);

    // Process both payment and order paid events
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload.payment ? event.payload.payment.entity : event.payload.order.entity;
      const rzpOrderId = entity.order_id || entity.id;
      
      const { firestore } = initializeFirebase();

      // --- Order Polling ---
      // We wait for the frontend to finish writing the order to Firestore.
      let orderDoc = null;
      let orderData = null;
      let orderItems: any[] = [];

      for (let i = 0; i < 5; i++) {
        const ordersRef = collection(firestore, 'orders');
        const q = query(ordersRef, where('razorpayOrderId', '==', rzpOrderId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          orderDoc = querySnapshot.docs[0];
          orderData = orderDoc.data();
          const itemsSnapshot = await getDocs(collection(firestore, 'orders', orderDoc.id, 'order_items'));
          orderItems = itemsSnapshot.docs.map(d => d.data());
          break;
        }
        
        // Wait 2 seconds before next retry
        if (i < 4) await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // --- Dispatch Notifications ---
      const targetEmail = orderData?.shippingDetails?.email || entity.email || entity.notes?.email;

      if (targetEmail) {
        await sendOrderEmails(targetEmail, orderDoc?.id || rzpOrderId, orderData || { totalAmount: entity.amount / 100 }, orderItems);
        console.log(`[Webhook] Success: Emails dispatched for ${targetEmail}`);
      } else {
        console.warn('[Webhook] No recipient email found in payload.');
      }
    }

    return NextResponse.json({ status: 'processed', timestamp: Date.now() }, { status: 200 });

  } catch (err: any) {
    console.error('[Webhook] Critical Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Sends professional emails to both the Customer and Admin.
 */
async function sendOrderEmails(customerEmail: string, orderId: string, orderData: any, items: any[]) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const brandLogoUrl = "https://res.cloudinary.com/dmtnonxtt/image/upload/v1770382083/wzhjmwclq9chpojzabgj.png";

  if (!smtpUser || !smtpPass) {
    throw new Error('Email server credentials missing.');
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

  // Generate Item List HTML
  const itemsHtml = items.length > 0 
    ? items.map(item => `
        <tr>
          <td style="padding: 15px 0; border-bottom: 1px solid #222;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td width="60" valign="top">
                  <img src="${item.image}" width="50" height="50" style="border-radius: 8px; object-fit: cover; background: #111;" />
                </td>
                <td style="padding-left: 15px;">
                  <p style="margin: 0; font-size: 14px; font-weight: 700; color: #ffffff;">${item.name}</p>
                  <p style="margin: 4px 0 0 0; font-size: 12px; color: #888;">Quantity: ${item.quantity} • Price: ₹${item.price.toLocaleString()}</p>
                </td>
                <td align="right" valign="top">
                  <p style="margin: 0; font-size: 14px; font-weight: 700; color: #BE29EC;">₹${(item.price * item.quantity).toLocaleString()}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `).join('')
    : `<tr><td style="padding: 20px 0; color: #888; font-size: 12px; text-align: center;">Order details are being processed. View full details in your account.</td></tr>`;

  // 1. CUSTOMER EMAIL (Modern Dark UI)
  const customerMailOptions = {
    from: `"WishZep Orders" <${smtpUser}>`,
    to: customerEmail,
    subject: `Order Confirmed: #${orderId.slice(-6).toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #000000; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 24px; overflow: hidden;">
                <tr><td height="6" style="background: linear-gradient(90deg, #BE29EC, #29A6EC);"></td></tr>
                <tr>
                  <td style="padding: 40px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td><img src="${brandLogoUrl}" alt="WishZep" height="40" style="display: block;" /></td>
                        <td align="right">
                          <span style="font-size: 10px; font-weight: 800; color: #29A6EC; text-transform: uppercase; letter-spacing: 1px; background: rgba(41, 166, 236, 0.1); padding: 5px 10px; border-radius: 5px;">CONFIRMED</span>
                        </td>
                      </tr>
                    </table>

                    <h1 style="font-size: 32px; font-weight: 800; margin: 30px 0 10px 0; color: #ffffff;">Thank you for your order!</h1>
                    <p style="font-size: 15px; color: #888; line-height: 1.6; margin: 0 0 30px 0;">Hello ${orderData.shippingDetails?.fullName || 'Customer'}, we've received your order and our team is already preparing it for shipment.</p>

                    <div style="background: #111; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
                      <h3 style="font-size: 12px; font-weight: 800; color: #666; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 15px 0;">Order Summary</h3>
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        ${itemsHtml}
                      </table>
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 15px;">
                        <tr>
                          <td style="color: #888; font-size: 14px;">Total Paid</td>
                          <td align="right" style="color: #29A6EC; font-size: 20px; font-weight: 800;">${formattedAmount}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="border: 1px solid #222; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
                      <h3 style="font-size: 12px; font-weight: 800; color: #666; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px 0;">Shipping Address</h3>
                      <p style="margin: 0; font-size: 14px; color: #ffffff; line-height: 1.5;">${orderData.shippingAddress || 'Address details available in your profile.'}</p>
                    </div>

                    <div style="text-align: center; margin-top: 40px;">
                      <a href="https://wishzep.shop/profile" style="background: #ffffff; color: #000000; padding: 15px 30px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">TRACK YOUR ORDER →</a>
                    </div>

                    <p style="margin-top: 40px; font-size: 11px; color: #444; text-align: center; border-top: 1px solid #1a1a1a; padding-top: 20px;">
                      WishZep Shop • All artifact sales are final. For support, please reply to this email.
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

  // 2. ADMIN ALERT (High Visibility)
  const adminMailOptions = {
    from: `"WishZep Alert" <${smtpUser}>`,
    to: smtpUser, 
    subject: `New Order: ${formattedAmount} [${orderId.slice(-6).toUpperCase()}]`,
    html: `
      <div style="background: #000; color: #fff; padding: 30px; font-family: sans-serif; border: 1px solid #BE29EC; border-radius: 16px; max-width: 500px; margin: auto;">
        <h2 style="color: #BE29EC; margin-top: 0; font-size: 18px;">New Sale Received!</h2>
        <div style="background: #111; padding: 15px; border-radius: 10px; margin: 20px 0;">
          <p style="margin: 5px 0; font-size: 12px; color: #888;">Order ID: <strong>${orderId}</strong></p>
          <p style="margin: 5px 0; font-size: 12px; color: #888;">Customer: <strong>${customerEmail}</strong></p>
          <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: 800; color: #00ff88;">${formattedAmount}</p>
        </div>
        <div style="text-align: center;">
          <a href="https://wishzep.shop/admin/dashboard" style="background: #BE29EC; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">OPEN ADMIN DASHBOARD</a>
        </div>
      </div>
    `,
  };

  await Promise.all([
    transporter.sendMail(customerMailOptions),
    transporter.sendMail(adminMailOptions)
  ]);
}
