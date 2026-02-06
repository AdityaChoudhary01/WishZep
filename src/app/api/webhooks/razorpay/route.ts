import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * Razorpay Webhook Endpoint
 * Path: /api/webhooks/razorpay
 */
export async function POST(req: Request) {
  try {
    const payload = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Security Protocol Check
    if (!secret || !signature) {
      console.error('[Webhook] Security protocol missing');
      return NextResponse.json({ error: 'Security protocol missing' }, { status: 400 });
    }

    // 2. Verify Signature to ensure request authenticity
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

    // 3. Handle Fulfillment Logic
    // We listen for both 'payment.captured' and 'order.paid' for maximum reliability
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload.payment ? event.payload.payment.entity : event.payload.order.entity;
      
      const orderId = entity.order_id || entity.id;
      const amount = entity.amount / 100;
      const userEmail = entity.email;

      if (!userEmail) {
        console.warn(`[Webhook] No email found for order ${orderId}, skipping email.`);
      } else {
        try {
          await sendOrderConfirmationEmail(userEmail, orderId, amount);
          console.log(`[Webhook] Email dispatched for Order: ${orderId}`);
        } catch (emailError) {
          console.error('[Webhook] SMTP Failure:', emailError);
          // We don't return an error to Razorpay here so they don't spam retries 
          // if it's just an email issue.
        }
      }
    }

    // 4. Always return 200 to Razorpay within 2-5 seconds
    return NextResponse.json({ status: 'processed', timestamp: Date.now() }, { status: 200 });

  } catch (err: any) {
    console.error('[Webhook] Critical Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Internal helper to send confirmation emails using SMTP
 */
async function sendOrderConfirmationEmail(email: string, orderId: string, amount: number) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials missing in environment variables.');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const mailOptions = {
    from: `"WishZep Fulfillment" <${smtpUser}>`,
    to: email,
    subject: `ORDER CONFIRMED: ${orderId}`,
    html: `
      <div style="font-family: sans-serif; padding: 40px; background-color: #f8f9fa; color: #212529;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 24px; border: 1px solid #eee; box-shadow: 0 10px 40px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <div style="width: 40px; height: 40px; background: #BE29EC; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 12px;">W</div>
            <h2 style="color: #BE29EC; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin: 0;">ORDER SECURED</h2>
          </div>
          <p style="font-size: 16px; line-height: 1.6;">Your drop has been successfully processed and logged in the WishZep registry.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <div style="background: #fdfdfd; padding: 20px; border-radius: 16px; border: 1px solid #f0f0f0;">
            <p style="margin: 0; font-size: 11px; color: #999; text-transform: uppercase; font-weight: 800;">Protocol ID</p>
            <p style="margin: 0 0 16px 0; font-weight: bold; font-family: monospace; color: #333;">${orderId}</p>
            <p style="margin: 0; font-size: 11px; color: #999; text-transform: uppercase; font-weight: 800;">Amount Paid</p>
            <p style="margin: 0; font-weight: bold; font-size: 20px; color: #BE29EC;">₹${amount.toLocaleString('en-IN')}</p>
          </div>
          <p style="margin-top: 32px; font-size: 14px; color: #666;">Our logistics team is currently preparing your artifacts for high-velocity dispatch. You will receive a tracking signal shortly.</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="font-size: 11px; color: #bbb; text-transform: uppercase; letter-spacing: 1px;">WishZep Fulfillment Engine</p>
          </div>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
