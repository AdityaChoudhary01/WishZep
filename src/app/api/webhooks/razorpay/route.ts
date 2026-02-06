import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as admin from 'firebase-admin'; // Only use Admin SDK

// --- 1. INITIALIZE ADMIN SDK (Server-Side Only) ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle private key newlines for Vercel/Env variables
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('[Webhook] Firebase Admin Initialized');
  } catch (error: any) {
    console.error('[Webhook] Firebase Admin Init Error:', error.message);
  }
}

// Get Admin Firestore Instance
const adminDb = admin.firestore();

/**
 * Path: /api/webhooks/razorpay
 * Protocol: Secure Server-to-Server Handshake
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
      console.error('[Webhook] Invalid Signature');
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
    }

    const event = JSON.parse(payload);
    
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload.payment ? event.payload.payment.entity : event.payload.order.entity;
      const rzpOrderId = entity.order_id || entity.id;
      
      console.log(`[Webhook] Searching for Order: ${rzpOrderId}`);

      // --- 2. RETRY LOGIC WITH ADMIN SDK ---
      let orderData = null;
      let orderId = null;
      let orderItems: any[] = [];

      // Try 3 times to find the order (wait for frontend write)
      for (let i = 0; i < 3; i++) {
        // USE adminDb (Server) NOT the client db
        const ordersRef = adminDb.collection('orders');
        const snapshot = await ordersRef.where('razorpayOrderId', '==', rzpOrderId).get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          orderId = doc.id;
          orderData = doc.data();
          
          // Get Items Subcollection
          const itemsSnap = await doc.ref.collection('order_items').get();
          orderItems = itemsSnap.docs.map(d => d.data());
          break;
        }
        // Wait 2 seconds before retrying
        if (i < 2) await new Promise(r => setTimeout(r, 2000));
      }

      // --- 3. EMAIL LOGIC ---
      const targetEmail = orderData?.shippingDetails?.email || entity.email || entity.notes?.email;

      if (targetEmail) {
        if (orderData && orderId) {
           await sendDualAuthEmails(targetEmail, orderId, orderData, orderItems);
           console.log(`[Webhook] RICH Email sent to ${targetEmail}`);
        } else {
           console.warn(`[Webhook] Order not found in DB. Sending BASIC email.`);
           await sendDualAuthEmails(targetEmail, rzpOrderId, { totalAmount: entity.amount / 100 }, []);
        }
      } else {
        console.error('[Webhook] No email found.');
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (err: any) {
    console.error('[Webhook] Error:', err.message);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

async function sendDualAuthEmails(customerEmail: string, orderId: string, orderData: any, items: any[]) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const brandLogoUrl = "https://res.cloudinary.com/dmtnonxtt/image/upload/v1770383164/oytykmuuhewune4jr7jz.png";

  if (!smtpUser || !smtpPass) {
    console.error("SMTP Credentials Missing");
    return;
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

  const itemsHtml = items.length > 0 
    ? items.map(item => `
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
      `).join('')
    : `<tr><td style="padding: 20px 0; color: #666; font-size: 12px;">Order details retrieved from payment gateway. Full manifest available in your account.</td></tr>`;

  // 1. Customer Email
  const customerMailOptions = {
    from: `"WishZep Registry" <${smtpUser}>`,
    to: customerEmail,
    subject: `CONFIRMED: Protocol ${orderId.slice(-6).toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 40px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.5);">
                <tr><td height="8" style="background: linear-gradient(90deg, #BE29EC, #29A6EC, #BE29EC);"></td></tr>
                <tr>
                  <td style="padding: 50px 40px;">
                    <div style="margin-bottom: 30px;">
                      <img src="${brandLogoUrl}" alt="WishZep" width="60" height="60" style="display: block; border-radius: 15px; object-fit: contain;" />
                    </div>
                    <h1 style="font-size: 42px; font-weight: 900; letter-spacing: -2px; margin: 40px 0 10px 0; color: #ffffff; text-transform: uppercase; line-height: 1;">Order <br/><span style="color: #BE29EC;">Secured.</span></h1>
                    <p style="font-size: 15px; color: #888; line-height: 1.6; margin: 0 0 40px 0;">Hi ${orderData.shippingDetails?.fullName || 'Visionary'}, your artifacts have been logged into the WishZep global registry.</p>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">${itemsHtml}</table>
                    <div style="margin-top: 40px; padding: 25px; border: 1px solid #1a1a1a; border-radius: 24px;">
                      <p style="margin: 0 0 15px 0; font-size: 11px; font-weight: 900; color: #666; letter-spacing: 2px; text-transform: uppercase;">Destination</p>
                      <p style="margin: 0; font-size: 14px; font-weight: 900; color: #ffffff;">${orderData.shippingDetails?.fullName || 'N/A'}</p>
                      <p style="margin: 5px 0 0 0; font-size: 13px; color: #888; line-height: 1.5;">${orderData.shippingAddress || 'Address data awaiting sync.'}</p>
                    </div>
                    <div style="margin-top: 50px; text-align: center;">
                      <a href="https://wishzep.shop/profile" style="background: linear-gradient(90deg, #BE29EC, #29A6EC); color: #ffffff; padding: 20px 40px; border-radius: 100px; text-decoration: none; font-weight: 900; font-size: 14px; letter-spacing: 1px; display: inline-block;">VIEW STATUS →</a>
                    </div>
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

  // 2. Admin Email
  const adminMailOptions = {
    from: `"WishZep Alert" <${smtpUser}>`,
    to: smtpUser, 
    subject: `🚨 NEW DROP: ${formattedAmount} [${orderId.slice(-6).toUpperCase()}]`,
    html: `
      <div style="background: #000; color: #fff; padding: 40px; font-family: monospace; border: 2px solid #BE29EC; border-radius: 24px;">
        <h2 style="color: #BE29EC; border-bottom: 1px solid #333; padding-bottom: 15px;">INBOUND SETTLEMENT</h2>
        <p>ORDER_ID: ${orderId}<br/>CUSTOMER: ${customerEmail}<br/>REVENUE: ${formattedAmount}</p>
        <a href="https://wishzep.shop/admin/dashboard" style="color: #BE29EC;">OPEN CONSOLE →</a>
      </div>
    `,
  };

  await Promise.all([
    transporter.sendMail(customerMailOptions),
    transporter.sendMail(adminMailOptions)
  ]);
}
