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

    // 2. Verify Signature
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

    // 3. Fulfillment Logic
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const entity = event.payload.payment ? event.payload.payment.entity : event.payload.order.entity;
      
      const orderId = entity.order_id || entity.id;
      const amount = entity.amount / 100;
      const userEmail = entity.email;

      if (userEmail) {
        try {
          await sendOrderConfirmationEmail(userEmail, orderId, amount);
          console.log(`[Webhook] Ultramodern Email dispatched for Order: ${orderId}`);
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
 * Internal helper to send confirmation emails with an Ultramodern Dark UI
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
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const mailOptions = {
    from: `"WishZep Logistics" <${smtpUser}>`,
    to: email,
    subject: `CONFIRMED: Protocol ${orderId.slice(-6).toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', -apple-system, sans-serif; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 32px; overflow: hidden; box-shadow: 0 20px 50px rgba(190, 41, 236, 0.15);">
                
                <tr>
                  <td height="6" style="background: linear-gradient(90deg, #BE29EC, #6366f1, #BE29EC);"></td>
                </tr>

                <tr>
                  <td style="padding: 50px 40px;">
                    <table width="100%">
                      <tr>
                        <td>
                          <div style="width: 44px; height: 44px; background: #BE29EC; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; color: white; box-shadow: 0 0 15px rgba(190, 41, 236, 0.5);">W</div>
                        </td>
                        <td align="right">
                          <span style="font-size: 9px; color: #555; text-transform: uppercase; letter-spacing: 3px; font-weight: 800;">WishZep Registry</span>
                        </td>
                      </tr>
                    </table>

                    <h1 style="font-size: 38px; font-weight: 900; letter-spacing: -2px; margin: 40px 0 10px 0; color: #ffffff; text-transform: uppercase;">Order <br/>Secured.</h1>
                    <p style="font-size: 15px; color: #888; line-height: 1.6; margin: 0 0 40px 0;">Your artifacts have been successfully logged. The fulfillment engine is initializing high-velocity dispatch protocols.</p>

                    <div style="background-color: #111111; border: 1px solid #222222; border-radius: 24px; padding: 30px; margin-bottom: 30px;">
                      <table width="100%">
                        <tr>
                          <td style="padding-bottom: 25px;">
                            <p style="margin: 0; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">Protocol ID</p>
                            <p style="margin: 6px 0 0 0; font-family: 'Courier New', monospace; font-size: 14px; color: #BE29EC; font-weight: bold;">${orderId}</p>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <p style="margin: 0; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">Authorized Amount</p>
                            <p style="margin: 6px 0 0 0; font-size: 32px; font-weight: 900; color: #ffffff;">₹${amount.toLocaleString('en-IN')}</p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <div style="display: inline-block; padding: 8px 16px; background: rgba(190, 41, 236, 0.1); border: 1px solid rgba(190, 41, 236, 0.3); border-radius: 100px; margin-bottom: 40px;">
                      <span style="font-size: 10px; color: #BE29EC; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">● Awaiting Final Dispatch</span>
                    </div>

                    <p style="font-size: 13px; color: #444; line-height: 1.6; border-top: 1px solid #1a1a1a; padding-top: 30px;">
                      This is an encrypted transaction record from WishZep Logistics. Artifacts will be dispatched to your registered destination within 24-48 hours.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <table width="100%">
                      <tr>
                        <td style="font-size: 10px; color: #333; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
                          © 2026 WISHZEP.INC
                        </td>
                        <td align="right">
                          <a href="#" style="color: #666; text-decoration: none; font-size: 10px; font-weight: 800; text-transform: uppercase;">Tracking Console</a>
                        </td>
                      </tr>
                    </table>
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

  await transporter.sendMail(mailOptions);
}
