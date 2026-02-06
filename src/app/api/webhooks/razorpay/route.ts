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

    // FIX: STRICTLY ONLY LISTEN TO 'order.paid'
    // This prevents duplicate emails from 'payment.captured'
    if (event.event === 'order.paid') {
      const entity = event.payload.order.entity;
      const rzpOrderId = entity.id;
      
      console.log(`[Webhook] Processing Order Payment: ${rzpOrderId}`);

      // --- RETRY LOGIC ---
      let orderDoc = null;
      let orderData = null;
      let orderItems: any[] = [];

      // Try 10 times (20 seconds) to find the order in Firestore
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
          break; 
        }
        await new Promise(r => setTimeout(r, 2000));
      }

      // Priority: DB Email -> Razorpay Notes Email -> Payload Email
      const targetEmail = orderData?.shippingDetails?.email || entity.notes?.email;

      if (targetEmail) {
        if (orderData && orderDoc) {
           // Mark as processed immediately
           await orderDoc.ref.update({ emailSent: true, status: 'processing' });
           
           await sendRichEmails(targetEmail, orderDoc.id, orderData, orderItems);
           console.log(`[Webhook] SUCCESS: Confirmation emails sent for ${orderDoc.id}`);
        } else {
           console.warn(`[Webhook] Order ${rzpOrderId} not found after retries. Sending fallback.`);
           // Fallback email logic if DB sync failed
           await sendFallbackEmails(targetEmail, rzpOrderId, entity.amount / 100);
        }
      } else {
        console.error(`[Webhook] FAILED: No email found for ${rzpOrderId}`);
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

// --- 1. RICH EMAILS (Standard Success) ---
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

  const emailBody = `<!DOCTYPE html><html><body style="background:#050505;font-family:sans-serif;color:#fff;padding:20px;">
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

  await Promise.all([
    transporter.sendMail({ from: `"WishZep" <${process.env.SMTP_USER}>`, to: customerEmail, subject: `Order Confirmed #${safeOrderId}`, html: emailBody }),
    transporter.sendMail({ from: `"WishZep Admin" <${process.env.SMTP_USER}>`, to: process.env.SMTP_USER, subject: `📦 NEW ORDER: ${formattedAmount}`, html: emailBody })
  ]);
}

// --- 2. FALLBACK EMAILS (DB Missing) ---
async function sendFallbackEmails(customerEmail: string, rzpOrderId: string, amount: number) {
  const transporter = getTransporter();
  const formattedAmount = `₹${amount.toLocaleString('en-IN')}`;
  const html = `<!DOCTYPE html><html><body style="background:#050505;font-family:sans-serif;color:#fff;padding:20px;">
    <div style="max-width:600px;margin:auto;background:#0a0a0a;border:1px solid #222;border-radius:30px;padding:40px;">
      <h1 style="text-align:center;">Payment <span style="color:#BE29EC;">Received</span></h1>
      <p style="text-align:center;color:#888;">We received ${formattedAmount}. Order generation pending.</p>
      <p style="text-align:center;font-family:monospace;color:#444;">Ref: ${rzpOrderId}</p>
    </div></body></html>`;

  await Promise.all([
    transporter.sendMail({ from: `"WishZep" <${process.env.SMTP_USER}>`, to: customerEmail, subject: `Payment Received: ${formattedAmount}`, html }),
    transporter.sendMail({ from: `"WishZep System" <${process.env.SMTP_USER}>`, to: process.env.SMTP_USER, subject: `⚠️ PAYMENT CAPTURED (DB SYNC PENDING)`, html })
  ]);
}
