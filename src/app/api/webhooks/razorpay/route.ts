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
    if (event.event === 'order.paid') {
      const entity = event.payload.order.entity;
      const rzpOrderId = entity.id;
      
      console.log(`[Webhook] Processing Order Payment: ${rzpOrderId}`);

      // --- RETRY LOGIC ---
      let orderDoc = null;
      let orderData = null;
      let orderItems: any[] = [];

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

      const targetEmail = orderData?.shippingDetails?.email || entity.notes?.email;

      if (targetEmail) {
        if (orderData && orderDoc) {
           // Mark as processed
           await orderDoc.ref.update({ emailSent: true, status: 'processing' });
           
           await sendRichEmails(targetEmail, orderDoc.id, orderData, orderItems);
           console.log(`[Webhook] SUCCESS: Distinct emails sent for ${orderDoc.id}`);
        } else {
           console.warn(`[Webhook] Order ${rzpOrderId} not found after retries. Sending fallback.`);
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

  // ------------------------------------------
  // SHARED: ITEM ROW GENERATOR
  // ------------------------------------------
  const generateItemRow = (item: any, isAdmin: boolean) => `
    <tr>
      <td style="padding: 15px 0; border-bottom: 1px solid #1a1a1a;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td width="70" valign="top">
              <img src="${item.image}" width="60" height="60" style="border-radius:12px; object-fit:cover; background:#111; display:block;" />
            </td>
            <td style="padding-left:15px; vertical-align:middle;">
              <p style="margin:0; font-size:14px; font-weight:700; color:#fff; line-height:1.4;">${item.name}</p>
              <p style="margin:4px 0 0; font-size:12px; color:#888;">
                Qty: ${item.quantity} ${isAdmin ? `<span style="color:#444; font-size:10px; margin-left:8px;">ID: ${item.id?.slice(0,5)}</span>` : ''}
              </p>
            </td>
            <td align="right" style="vertical-align:middle;">
              <p style="margin:0; font-size:14px; font-weight:700; color:${isAdmin ? '#00ff88' : '#fff'};">
                ₹${(item.price * item.quantity).toLocaleString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const customerItemsHtml = items.map(i => generateItemRow(i, false)).join('');
  const adminItemsHtml = items.map(i => generateItemRow(i, true)).join('');

  // ------------------------------------------
  // 1. CUSTOMER TEMPLATE
  // ------------------------------------------
  const customerHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="background:#000000; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; color:#ffffff; padding:0; margin:0;">
      <div style="max-width:600px; margin:0 auto; background:#0a0a0a; min-height:100vh;">
        <div style="text-align:center; padding:40px 20px;">
          <img src="${BRAND_LOGO}" width="80" style="margin-bottom:30px;" />
          <h1 style="font-size:28px; font-weight:800; margin:0 0 10px; color:#fff;">Order Confirmed</h1>
          <p style="font-size:15px; color:#888; line-height:1.6; margin:0;">
            Hi ${orderData.shippingDetails?.fullName}, thank you for your order. We've received it and are getting it ready.
          </p>
        </div>

        <div style="padding:0 20px;">
          <div style="background:#111; border-radius:20px; padding:25px; margin-bottom:15px; border:1px solid #222;">
            <p style="margin:0 0 15px; font-size:11px; font-weight:bold; color:#BE29EC; text-transform:uppercase; letter-spacing:1px;">Your Items</p>
            <table width="100%" cellspacing="0" cellpadding="0">${customerItemsHtml}</table>
            <div style="margin-top:20px; padding-top:20px; border-top:1px solid #222; display:flex; justify-content:space-between;">
              <span style="color:#aaa; font-size:14px;">Total</span>
              <span style="font-size:18px; font-weight:800; color:#fff;">${formattedAmount}</span>
            </div>
          </div>

          <div style="background:#111; border-radius:20px; padding:25px; margin-bottom:15px; border:1px solid #222;">
            <p style="margin:0 0 15px; font-size:11px; font-weight:bold; color:#BE29EC; text-transform:uppercase; letter-spacing:1px;">Delivering To</p>
            <p style="margin:0; font-size:15px; font-weight:bold; color:#fff;">${orderData.shippingDetails?.fullName}</p>
            <p style="margin:5px 0 15px; font-size:14px; color:#ccc; line-height:1.5;">${orderData.shippingAddress}</p>
            <p style="margin:0; font-size:13px; color:#888;">📞 ${orderData.shippingDetails?.contactNumber}</p>
          </div>

          <div style="background:#111; border-radius:20px; padding:25px; margin-bottom:30px; border:1px solid #222;">
            <p style="margin:0 0 15px; font-size:11px; font-weight:bold; color:#BE29EC; text-transform:uppercase; letter-spacing:1px;">Payment Info</p>
            <p style="margin:0 0 5px; font-size:13px; color:#ccc;">Method: <span style="color:#fff;">${orderData.paymentMethod || 'Online'}</span></p>
            <p style="margin:0; font-size:13px; color:#ccc;">Date: <span style="color:#fff;">${orderDate}</span></p>
          </div>

          <div style="text-align:center; margin-bottom:40px;">
            <a href="https://wishzep.shop/profile" style="background:#BE29EC; color:#fff; padding:16px 40px; text-decoration:none; border-radius:50px; font-weight:bold; font-size:14px; display:inline-block;">Track Order</a>
          </div>

          <div style="text-align:center; padding-bottom:40px; color:#444; font-size:11px;">
            <p style="margin:0;">Order #${safeOrderId}</p>
            <p style="margin:5px 0 0;">© 2026 WishZep</p>
          </div>
        </div>
      </div>
    </body>
    </html>`;

  // ------------------------------------------
  // 2. ADMIN TEMPLATE (Redesigned: Ultra Modern)
  // ------------------------------------------
  const adminHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="background:#000000; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; color:#ffffff; padding:0; margin:0;">
      <div style="max-width:600px; margin:0 auto; background:#0a0a0a; min-height:100vh; border-left:1px solid #1a1a1a; border-right:1px solid #1a1a1a;">
        
        <div style="background:#111; padding:20px; border-bottom:1px solid #222; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:12px; font-weight:bold; color:#00ff88; letter-spacing:1px;">● NEW ORDER RECEIVED</div>
          <div style="font-size:12px; color:#666;">${orderDate}</div>
        </div>

        <div style="padding:30px 20px;">
          <div style="text-align:center; margin-bottom:40px;">
            <p style="margin:0 0 5px; font-size:11px; font-weight:bold; color:#666; text-transform:uppercase; letter-spacing:2px;">Revenue Generated</p>
            <h1 style="margin:0; font-size:42px; font-weight:900; color:#fff; letter-spacing:-1px;">${formattedAmount}</h1>
            <p style="margin:10px 0 0; font-size:12px; color:#00ff88; background:rgba(0,255,136,0.1); display:inline-block; padding:4px 10px; border-radius:20px;">Paid via ${orderData.paymentMethod}</p>
          </div>

          <div style="background:#111; border-radius:20px; padding:25px; margin-bottom:20px; border:1px solid #222;">
            <p style="margin:0 0 20px; font-size:11px; font-weight:bold; color:#BE29EC; text-transform:uppercase; letter-spacing:1px;">Customer Dossier</p>
            
            <div style="margin-bottom:15px;">
              <p style="margin:0 0 4px; font-size:10px; color:#666; text-transform:uppercase;">Name</p>
              <p style="margin:0; font-size:14px; font-weight:bold; color:#fff;">${orderData.shippingDetails?.fullName}</p>
            </div>
            
            <div style="display:flex; gap:20px; margin-bottom:15px;">
              <div style="flex:1;">
                <p style="margin:0 0 4px; font-size:10px; color:#666; text-transform:uppercase;">Email</p>
                <p style="margin:0; font-size:13px; color:#ccc; word-break:break-all;">${customerEmail}</p>
              </div>
              <div style="flex:1;">
                <p style="margin:0 0 4px; font-size:10px; color:#666; text-transform:uppercase;">Phone</p>
                <p style="margin:0; font-size:13px; color:#ccc;">${orderData.shippingDetails?.contactNumber}</p>
              </div>
            </div>

            <div>
              <p style="margin:0 0 4px; font-size:10px; color:#666; text-transform:uppercase;">Shipping Address</p>
              <p style="margin:0; font-size:13px; color:#ccc; line-height:1.5;">${orderData.shippingAddress}</p>
            </div>
          </div>

          <div style="background:#111; border-radius:20px; padding:25px; margin-bottom:30px; border:1px solid #222;">
            <p style="margin:0 0 15px; font-size:11px; font-weight:bold; color:#BE29EC; text-transform:uppercase; letter-spacing:1px;">Items to Pack</p>
            <table width="100%" cellspacing="0" cellpadding="0">
              ${adminItemsHtml}
            </table>
          </div>

          <a href="https://wishzep.shop/admin/dashboard" style="display:block; background:#fff; color:#000; text-align:center; padding:18px 0; text-decoration:none; font-weight:900; border-radius:12px; font-size:14px; letter-spacing:0.5px;">
            OPEN ADMIN DASHBOARD
          </a>
          
          <div style="margin-top:30px; text-align:center;">
            <p style="margin:0; color:#444; font-size:10px; font-family:monospace;">
              ORDER_ID: ${orderId}<br>
              RZP_REF: ${orderData.razorpayOrderId}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>`;

  await Promise.all([
    transporter.sendMail({ 
      from: `"WishZep" <${process.env.SMTP_USER}>`, 
      to: customerEmail, 
      subject: `Order Confirmed #${safeOrderId}`, 
      html: customerHtml 
    }),
    transporter.sendMail({ 
      from: `"WishZep Alert" <${process.env.SMTP_USER}>`, 
      to: process.env.SMTP_USER, // Send to Admin
      subject: `🚨 NEW ORDER: ${formattedAmount} from ${orderData.shippingDetails?.fullName}`, 
      html: adminHtml 
    })
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
