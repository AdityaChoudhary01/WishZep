import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import * as admin from 'firebase-admin';

// --- 1. INITIALIZE ADMIN SDK ---
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('Firebase Admin Init Error:', error.message);
  }
}
const adminDb = admin.firestore();

export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!secret || !signature) return NextResponse.json({ error: 'Security missing' }, { status: 400 });

    const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (expectedSignature !== signature) return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });

    const event = JSON.parse(payload);

    // Filter for order.paid (Primary) or payment.captured (Fallback)
    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const entity = event.payload.payment ? event.payload.payment.entity : event.payload.order.entity;
      const rzpOrderId = entity.order_id || entity.id; 
      
      console.log(`[Webhook] Processing Order: ${rzpOrderId}`);

      // --- RETRY LOGIC ---
      let orderDoc = null;
      let orderData = null;
      let orderItems: any[] = [];

      for (let i = 0; i < 3; i++) {
        const ordersRef = adminDb.collection('orders');
        const snapshot = await ordersRef.where('razorpayOrderId', '==', rzpOrderId).get();

        if (!snapshot.empty) {
          orderDoc = snapshot.docs[0];
          orderData = orderDoc.data();
          
          // IDEMPOTENCY CHECK
          if (orderData.emailSent === true) {
            console.log(`[Webhook] Skipped: Email already sent for ${rzpOrderId}`);
            return NextResponse.json({ status: 'already_processed' }, { status: 200 });
          }

          const itemsSnap = await orderDoc.ref.collection('order_items').get();
          orderItems = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          break;
        }
        if (i < 2) await new Promise(r => setTimeout(r, 2000));
      }

      const targetEmail = orderData?.shippingDetails?.email || entity.email || entity.notes?.email;

      if (orderData && orderDoc && targetEmail) {
         // Mark as processed
         await orderDoc.ref.update({ emailSent: true, status: 'processing' });

         await sendDualAuthEmails(targetEmail, orderDoc.id, orderData, orderItems);
         console.log(`[Webhook] SUCCESS: Emails dispatched for ${orderDoc.id}`);
      } else {
         console.warn(`[Webhook] Order ${rzpOrderId} not found or No Email. Skipping.`);
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

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(orderData.totalAmount || 0);
  const safeOrderId = (orderId || 'UNKNOWN').toString().slice(-6).toUpperCase();
  const orderDate = orderData.createdAt ? new Date(orderData.createdAt.toDate()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString();

  // Helper to generate Item List HTML
  const generateItemsHtml = (isAdmin = false) => items.map(item => `
    <tr>
      <td style="padding: 15px 0; border-bottom: 1px solid #1a1a1a;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td width="70" valign="top"><img src="${item.image}" width="60" height="60" style="border-radius: 10px; object-fit: cover; display:block;" /></td>
            <td style="padding-left: 15px; vertical-align: middle;">
              <p style="margin:0; font-size:14px; font-weight:700; color:#fff; text-transform:uppercase; letter-spacing:0.5px;">${item.name}</p>
              <p style="margin:4px 0 0; font-size:11px; color:#888;">QTY: ${item.quantity} ${isAdmin ? `| ID: ${(item.id || 'N/A').toString().slice(0,5)}` : ''}</p>
            </td>
            <td align="right" style="vertical-align: middle;">
              <p style="margin:0; font-size:14px; font-weight:700; color:${isAdmin ? '#00ff88' : '#BE29EC'};">₹${(item.price * item.quantity).toLocaleString()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('');

  // --- 1. CUSTOMER EMAIL (ENHANCED UI) ---
  const customerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="background:#000000; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; color:#ffffff; padding:0; margin:0;">
      <div style="max-width:600px; margin:0 auto; background:#0a0a0a; overflow:hidden;">
        
        <div style="height:4px; background:linear-gradient(90deg, #BE29EC, #29A6EC);"></div>
        
        <div style="padding:40px 30px;">
          
          <div style="text-align:center; margin-bottom:40px;">
            <img src="${brandLogoUrl}" width="120" style="display:block; margin:0 auto;" alt="WishZep" />
          </div>

          <div style="text-align:center; margin-bottom:40px;">
            <h1 style="font-size:32px; font-weight:900; letter-spacing:-1px; margin:0 0 10px 0; color:#ffffff; text-transform:uppercase;">Order <span style="color:#BE29EC;">Confirmed</span></h1>
            <p style="font-size:14px; color:#888888; line-height:1.6; margin:0; max-width:400px; margin-left:auto; margin-right:auto;">
              Hi ${orderData.shippingDetails?.fullName}, your artifacts have been secured. The global fulfillment engine is now active.
            </p>
          </div>
          
          <div style="background:#111111; border-radius:24px; border:1px solid #222222; overflow:hidden; margin-bottom:30px;">
            <div style="padding:25px;">
              <p style="margin:0 0 15px; font-size:10px; font-weight:bold; letter-spacing:2px; color:#666; text-transform:uppercase;">Manifest</p>
              <table width="100%" cellspacing="0" cellpadding="0">
                ${generateItemsHtml(false)}
              </table>
              <div style="margin-top:20px; padding-top:20px; border-top:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#888; font-size:12px; letter-spacing:1px; text-transform:uppercase;">Total Authorized</span>
                <span style="font-size:24px; font-weight:900; color:#ffffff;">${formattedAmount}</span>
              </div>
            </div>
          </div>

          <div style="background:#111111; border-radius:24px; border:1px solid #222222; padding:25px; margin-bottom:15px;">
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="30" valign="top" style="padding-right:15px;">
                  <span style="display:block; font-size:18px;">📍</span>
                </td>
                <td>
                  <p style="margin:0 0 5px; font-size:11px; font-weight:bold; letter-spacing:1px; color:#BE29EC; text-transform:uppercase;">Shipping Destination</p>
                  <p style="margin:0 0 5px; font-size:14px; font-weight:bold; color:#fff;">${orderData.shippingDetails?.fullName}</p>
                  <p style="margin:0 0 8px; font-size:13px; color:#bbb; line-height:1.5;">${orderData.shippingAddress}</p>
                  <p style="margin:0; font-size:13px; color:#fff; font-weight:bold;">📞 ${orderData.shippingDetails?.contactNumber}</p>
                </td>
              </tr>
            </table>
          </div>

          <div style="background:#111111; border-radius:24px; border:1px solid #222222; padding:25px; margin-bottom:40px;">
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="30" valign="top" style="padding-right:15px;">
                  <span style="display:block; font-size:18px;">💳</span>
                </td>
                <td>
                  <p style="margin:0 0 5px; font-size:11px; font-weight:bold; letter-spacing:1px; color:#BE29EC; text-transform:uppercase;">Transaction Info</p>
                  <p style="margin:0 0 5px; font-size:13px; color:#bbb;">Date: <span style="color:#fff;">${orderDate}</span></p>
                  <p style="margin:0 0 5px; font-size:13px; color:#bbb;">Method: <span style="color:#fff;">${orderData.paymentMethod || 'Online Payment'}</span></p>
                  <p style="margin:0; font-size:13px; color:#bbb;">Ref ID: <span style="color:#fff; font-family:monospace;">${orderData.razorpayOrderId?.slice(-8).toUpperCase()}</span></p>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="text-align:center;">
            <a href="https://wishzep.vercel.app/profile" style="background:#BE29EC; color:#fff; padding:18px 40px; text-decoration:none; border-radius:100px; font-weight:bold; font-size:13px; letter-spacing:1px; display:inline-block; box-shadow: 0 10px 40px rgba(190, 41, 236, 0.4);">TRACK STATUS</a>
          </div>
          
          <div style="text-align:center; margin-top:40px; padding-top:20px; border-top:1px solid #1a1a1a;">
            <p style="margin:0; color:#444; font-size:10px;">Order Reference: #${safeOrderId}</p>
            <p style="margin:5px 0 0; color:#333; font-size:10px;">© 2026 WishZep. Secure Transaction.</p>
          </div>

        </div>
      </div>
    </body>
    </html>`;

  // --- 2. ADMIN EMAIL ---
  const adminHtml = `
    <!DOCTYPE html><html><body style="background:#000; font-family:monospace; color:#fff; padding:40px 10px;">
    <div style="max-width:600px; margin:auto; background:#050505; border:1px solid #333; border-radius:16px;">
      <div style="background:#111; padding:20px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center;">
        <span style="color:#00ff88; font-weight:900; font-size:16px;">★ NEW ORDER</span>
        <span style="background:#00ff88; color:#000; padding:4px 8px; border-radius:4px; font-weight:bold; font-size:12px;">PAID</span>
      </div>
      
      <div style="padding:30px;">
        <table width="100%" style="margin-bottom:30px;">
          <tr>
            <td><p style="margin:0; color:#666; font-size:10px;">ORDER ID</p><p style="margin:5px 0 0; font-size:14px;">${orderId}</p></td>
            <td align="right"><p style="margin:0; color:#666; font-size:10px;">REVENUE</p><p style="margin:5px 0 0; font-size:24px; color:#fff; font-weight:900;">${formattedAmount}</p></td>
          </tr>
        </table>

        <div style="background:#111; padding:20px; border-radius:12px; margin-bottom:30px; border:1px solid #222;">
          <p style="margin:0 0 15px; color:#BE29EC; font-size:11px; font-weight:900; text-transform:uppercase;">Shipping Manifest</p>
          <p style="margin:0 0 5px; font-size:14px; font-weight:bold;">${orderData.shippingDetails?.fullName}</p>
          <p style="margin:0 0 5px; font-size:13px; color:#ccc;">${orderData.shippingAddress}</p>
          <p style="margin:0 0 5px; font-size:13px; color:#BE29EC;">📞 ${orderData.shippingDetails?.contactNumber}</p>
          <p style="margin:0; font-size:13px; color:#888;">✉️ ${customerEmail}</p>
        </div>

        <div style="margin-bottom:30px;">
          <p style="margin:0 0 10px; color:#666; font-size:10px; text-transform:uppercase; font-weight:900;">Items to Pack</p>
          <table width="100%" cellspacing="0" cellpadding="0">
            ${generateItemsHtml(true)}
          </table>
        </div>

        <a href="https://wishzep.vercel.app/admin/dashboard" style="display:block; width:100%; background:#00ff88; color:#000; text-align:center; padding:18px 0; text-decoration:none; font-weight:900; border-radius:8px; font-size:14px;">OPEN DISPATCH CONSOLE</a>
        
        <p style="margin-top:20px; text-align:center; color:#444; font-size:10px;">Razorpay ID: ${orderData.razorpayOrderId}</p>
      </div>
    </div></body></html>`;

  const promises = [
    transporter.sendMail({ from: `"WishZep Alert" <${smtpUser}>`, to: smtpUser, subject: `🚨 NEW ORDER: ${formattedAmount} from ${orderData.shippingDetails?.fullName}`, html: adminHtml })
  ];

  if (customerEmail) {
    promises.push(transporter.sendMail({ from: `"WishZep" <${smtpUser}>`, to: customerEmail, subject: `Order Confirmed #${safeOrderId}`, html: customerHtml }));
  }

  await Promise.all(promises);
}
