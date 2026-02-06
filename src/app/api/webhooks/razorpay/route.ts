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

    if (event.event === 'order.paid' || event.event === 'payment.captured') {
      const entity = event.payload.payment ? event.payload.payment.entity : event.payload.order.entity;
      const rzpOrderId = entity.order_id || entity.id;
      
      console.log(`[Webhook] Processing Order: ${rzpOrderId}`);

      // --- RETRY LOGIC (INCREASED TO 20 SECONDS) ---
      let orderDoc = null;
      let orderData = null;
      let orderItems: any[] = [];

      // Try 10 times (2 seconds delay each) = 20 Seconds Total Wait
      for (let i = 0; i < 10; i++) {
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
          break; // Found it!
        }
        // Wait 2 seconds
        await new Promise(r => setTimeout(r, 2000));
      }

      // Extract Email from DB (Priority) OR Razorpay Payload (Fallback)
      const targetEmail = orderData?.shippingDetails?.email || entity.email || entity.notes?.email;

      if (targetEmail) {
        if (orderData && orderDoc) {
           // SCENARIO A: Full Data Found -> Send Rich Email
           await orderDoc.ref.update({ emailSent: true, status: 'processing' }); // Mark sent
           await sendRichEmails(targetEmail, orderDoc.id, orderData, orderItems);
           console.log(`[Webhook] SUCCESS: Rich emails dispatched for ${orderDoc.id}`);
        } else {
           // SCENARIO B: Data Missing -> Send Basic Fallback Email
           console.warn(`[Webhook] Database sync too slow. Sending FALLBACK email to ${targetEmail}`);
           const amount = entity.amount / 100;
           await sendFallbackEmails(targetEmail, rzpOrderId, amount);
        }
      } else {
        console.error(`[Webhook] FAILED: No email found for ${rzpOrderId}. Check Frontend Code.`);
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });

  } catch (err: any) {
    console.error('[Webhook] Error:', err.message);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

// --- EMAILER SETUP ---
const getTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
};
const BRAND_LOGO = "https://res.cloudinary.com/dmtnonxtt/image/upload/v1770383164/oytykmuuhewune4jr7jz.png";

// --- 1. RICH EMAILS (When DB Data Exists) ---
async function sendRichEmails(customerEmail: string, orderId: string, orderData: any, items: any[]) {
  const transporter = getTransporter();
  const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(orderData.totalAmount || 0);
  const safeOrderId = (orderId || 'UNKNOWN').toString().slice(-6).toUpperCase();
  const orderDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 15px 0; border-bottom: 1px solid #1a1a1a;">
        <table width="100%"><tr>
          <td width="60"><img src="${item.image}" width="50" height="50" style="border-radius:8px; object-fit:cover;" /></td>
          <td style="padding-left:15px;"><p style="margin:0;font-size:13px;font-weight:800;color:#fff;">${item.name}</p><p style="margin:2px 0 0;font-size:10px;color:#888;">QTY: ${item.quantity}</p></td>
          <td align="right"><p style="margin:0;font-size:13px;font-weight:800;color:#BE29EC;">₹${(item.price * item.quantity).toLocaleString()}</p></td>
        </tr></table>
      </td>
    </tr>`).join('');

  // Rich Customer Template
  const customerHtml = `<!DOCTYPE html><html><body style="background:#050505;font-family:sans-serif;color:#fff;padding:20px;">
    <div style="max-width:600px;margin:auto;background:#0a0a0a;border:1px solid #222;border-radius:30px;overflow:hidden;">
      <div style="height:4px;background:linear-gradient(90deg,#BE29EC,#29A6EC);"></div>
      <div style="padding:40px;">
        <img src="${BRAND_LOGO}" width="120" style="margin-bottom:30px;display:block;margin-left:auto;margin-right:auto;" />
        <h1 style="text-align:center;font-size:32px;margin:0 0 10px;text-transform:uppercase;">Order <span style="color:#BE29EC;">Confirmed</span></h1>
        <p style="text-align:center;color:#888;font-size:14px;margin-bottom:40px;">Hi ${orderData.shippingDetails?.fullName}, your artifacts are secured.</p>
        <div style="background:#111;padding:20px;border-radius:20px;margin-bottom:20px;">
          <table width="100%">${itemsHtml}</table>
          <div style="border-top:1px solid #222;margin-top:15px;padding-top:15px;text-align:right;">
            <span style="color:#888;font-size:12px;margin-right:10px;">TOTAL</span><span style="font-size:20px;font-weight:900;">${formattedAmount}</span>
          </div>
        </div>
        <div style="background:#111;border-radius:20px;padding:20px;display:flex;gap:20px;flex-wrap:wrap;">
          <div style="flex:1;"><p style="margin:0 0 5px;color:#BE29EC;font-size:10px;font-weight:900;text-transform:uppercase;">Shipping To</p><p style="margin:0;font-size:13px;color:#fff;">${orderData.shippingAddress}</p></div>
          <div style="flex:1;"><p style="margin:0 0 5px;color:#BE29EC;font-size:10px;font-weight:900;text-transform:uppercase;">Details</p><p style="margin:0;font-size:12px;color:#aaa;">Date: ${orderDate}<br>Ref: #${safeOrderId}</p></div>
        </div>
        <div style="text-align:center;margin-top:40px;"><a href="https://wishzep.shop/profile" style="background:#BE29EC;color:#fff;padding:15px 40px;text-decoration:none;border-radius:50px;font-weight:bold;font-size:12px;">TRACK STATUS</a></div>
      </div></div></body></html>`;

  // Rich Admin Template
  const adminHtml = `<!DOCTYPE html><html><body style="background:#000;font-family:monospace;color:#fff;padding:20px;">
    <div style="max-width:600px;margin:auto;background:#111;border:1px solid #333;border-radius:16px;padding:30px;">
      <h2 style="color:#00ff88;margin-top:0;">★ NEW ORDER: ${formattedAmount}</h2>
      <p>ORDER_ID: ${orderId}<br>CUSTOMER: ${customerEmail}<br>NAME: ${orderData.shippingDetails?.fullName}</p>
      <div style="background:#000;padding:15px;border-radius:8px;margin:20px 0;"><table width="100%">${itemsHtml}</table></div>
      <a href="https://wishzep.shop/admin/dashboard" style="color:#BE29EC;font-weight:bold;">OPEN CONSOLE →</a>
    </div></body></html>`;

  await Promise.all([
    transporter.sendMail({ from: `"WishZep" <${process.env.SMTP_USER}>`, to: customerEmail, subject: `Order Confirmed #${safeOrderId}`, html: customerHtml }),
    transporter.sendMail({ from: `"WishZep Alert" <${process.env.SMTP_USER}>`, to: process.env.SMTP_USER, subject: `🚨 NEW ORDER: ${formattedAmount}`, html: adminHtml })
  ]);
}

// --- 2. FALLBACK EMAILS (When DB Data Missing) ---
async function sendFallbackEmails(customerEmail: string, rzpOrderId: string, amount: number) {
  const transporter = getTransporter();
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;

  const fallbackCustomerHtml = `<!DOCTYPE html><html><body style="background:#050505;font-family:sans-serif;color:#fff;padding:20px;">
    <div style="max-width:600px;margin:auto;background:#0a0a0a;border:1px solid #222;border-radius:30px;padding:40px;">
      <img src="${BRAND_LOGO}" width="100" style="margin-bottom:30px;display:block;margin-left:auto;margin-right:auto;" />
      <h1 style="text-align:center;text-transform:uppercase;">Payment <span style="color:#BE29EC;">Received</span></h1>
      <p style="text-align:center;color:#888;">We received your payment of ${formattedAmount}. Your order is being generated in our system.</p>
      <p style="text-align:center;font-family:monospace;color:#444;margin-top:20px;">Ref: ${rzpOrderId}</p>
    </div></body></html>`;

  const fallbackAdminHtml = `<!DOCTYPE html><html><body style="background:#000;font-family:monospace;color:#fff;padding:20px;">
    <div style="border:1px solid #BE29EC;padding:20px;border-radius:10px;">
      <h2 style="color:#BE29EC;">💰 PAYMENT RECEIVED (DB PENDING)</h2>
      <p>Amount: ${formattedAmount}<br>Email: ${customerEmail}<br>Razorpay ID: ${rzpOrderId}</p>
      <p style="color:#888;font-size:12px;">Note: Order document was not found in Firestore yet. Check Admin Dashboard manually.</p>
    </div></body></html>`;

  await Promise.all([
    transporter.sendMail({ from: `"WishZep" <${process.env.SMTP_USER}>`, to: customerEmail, subject: `Payment Received: ${formattedAmount}`, html: fallbackCustomerHtml }),
    transporter.sendMail({ from: `"WishZep System" <${process.env.SMTP_USER}>`, to: process.env.SMTP_USER, subject: `⚠️ PAYMENT CAPTURED (DB SYNC PENDING)`, html: fallbackAdminHtml })
  ]);
}
