import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

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
      console.error('[Webhook] Invalid Signature Detected');
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
    }

    const event = JSON.parse(payload);
    console.log(`[Webhook] Processing: ${event.event}`);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload.payment ? event.payload.payment.entity : event.payload.order.entity;
      
      const orderId = entity.order_id || entity.id;
      const amount = entity.amount / 100;
      const userEmail = entity.email;

      if (userEmail) {
        try {
          // Trigger Dual Authentication Emails (Customer + Admin)
          await sendDualAuthEmails(userEmail, orderId, amount);
          console.log(`[Webhook] Success: Communications dispatched for Order: ${orderId}`);
        } catch (emailError) {
          console.error('[Webhook] SMTP Failure:', emailError);
        }
      }
    }

    return NextResponse.json({ status: 'processed', timestamp: Date.now() }, { status: 200 });

  } catch (err: any) {
    console.error('[Webhook] Critical Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Sends a high-end Dark UI email to customer and technical dispatch alert to admin.
 */
async function sendDualAuthEmails(customerEmail: string, orderId: string, amount: number) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials missing in environment variables.');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPass },
  });

  // --- 1. CUSTOMER EMAIL: ULTRAMODERN DARK UI ---
  const customerMailOptions = {
    from: `"WishZep Logistics" <${smtpUser}>`,
    to: customerEmail,
    subject: `CONFIRMED: Protocol ${orderId.slice(-6).toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #050505; font-family: sans-serif; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 50px rgba(190, 41, 236, 0.15);">
                <tr><td height="6" style="background: linear-gradient(90deg, #BE29EC, #6366f1, #BE29EC);"></td></tr>
                <tr>
                  <td style="padding: 50px 40px;">
                    <div style="width: 44px; height: 44px; background: #BE29EC; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; color: white;">W</div>
                    <h1 style="font-size: 38px; font-weight: 900; letter-spacing: -2px; margin: 40px 0 10px 0; color: #ffffff; text-transform: uppercase;">Order <br/>Secured.</h1>
                    <p style="font-size: 15px; color: #888; line-height: 1.6; margin: 0 0 40px 0;">Your artifacts have been successfully logged. The fulfillment engine is initializing high-velocity dispatch protocols.</p>
                    <div style="background-color: #111; border: 1px solid #222; border-radius: 24px; padding: 30px; margin-bottom: 30px;">
                      <p style="margin: 0; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">Protocol ID</p>
                      <p style="margin: 6px 0 16px 0; font-family: monospace; font-size: 14px; color: #BE29EC; font-weight: bold;">${orderId}</p>
                      <p style="margin: 0; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">Authorized Amount</p>
                      <p style="margin: 6px 0 0 0; font-size: 32px; font-weight: 900; color: #ffffff;">₹${amount.toLocaleString('en-IN')}</p>
                    </div>
                    <div style="display: inline-block; padding: 8px 16px; background: rgba(190, 41, 236, 0.1); border: 1px solid rgba(190, 41, 236, 0.3); border-radius: 100px; margin-bottom: 40px;">
                      <span style="font-size: 10px; color: #BE29EC; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">● Awaiting Final Dispatch</span>
                    </div>
                    <p style="font-size: 11px; color: #444; border-top: 1px solid #1a1a1a; padding-top: 30px;">© 2026 WISHZEP REGISTRY. Encrypted Transaction Record.</p>
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

  // --- 2. ADMIN ALERT: DISPATCH CONSOLE UI ---
  const adminMailOptions = {
    from: `"WishZep Alert" <${smtpUser}>`,
    to: smtpUser, 
    subject: `🚨 NEW ORDER: ₹${amount} [${orderId.slice(-6).toUpperCase()}]`,
    html: `
      <div style="background: #000; color: #fff; padding: 40px; font-family: monospace; border: 2px solid #BE29EC; border-radius: 16px;">
        <h2 style="color: #BE29EC; border-bottom: 1px solid #333; padding-bottom: 10px; margin-top: 0;">INBOUND SETTLEMENT</h2>
        <table width="100%" style="color: #888; font-size: 14px; border-collapse: collapse;">
          <tr><td style="padding: 8px 0;">ORDER_ID:</td><td style="color: #fff;">${orderId}</td></tr>
          <tr><td style="padding: 8px 0;">CUSTOMER:</td><td style="color: #fff;">${customerEmail}</td></tr>
          <tr><td style="padding: 8px 0;">REVENUE:</td><td style="color: #0f0; font-weight: bold;">₹${amount}</td></tr>
        </table>
        
        <div style="margin-top: 35px; text-align: center;">
          <a href="https://wishzep.vercel.app/admin/dashboard" 
             style="background: #BE29EC; color: #fff; padding: 18px 30px; text-decoration: none; border-radius: 12px; font-weight: bold; font-family: sans-serif; display: inline-block; box-shadow: 0 4px 20px rgba(190, 41, 236, 0.4);">
             OPEN DISPATCH CONSOLE →
          </a>
        </div>
        <p style="margin-top: 30px; color: #444; font-size: 10px; text-align: center;">AUTHENTICATED BY RAZORPAY WEBHOOK KERNEL</p>
      </div>
    `,
  };

  // Dispatch both emails simultaneously
  await Promise.all([
    transporter.sendMail(customerMailOptions),
    transporter.sendMail(adminMailOptions)
  ]);
}
