'use server';

import nodemailer from 'nodemailer';

/**
 * Server Action to send contact emails via SMTP.
 * Ultra-modern aesthetic with enhanced logo visibility.
 */
export async function sendContactEmail(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string || 'General Inquiry';
  const message = formData.get('message') as string;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!name || !email || !message) {
    return { success: false, error: 'Please fill in all fields.' };
  }

  if (!smtpUser || !smtpPass) {
    return { success: false, error: 'Email service is not ready yet.' };
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
    from: `"WishZep Support" <${smtpUser}>`,
    to: smtpUser,
    replyTo: email,
    subject: `🚀 New Lead: ${subject} - ${name}`,
    text: `New message from: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #0a0b10; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0a0b10; padding: 60px 20px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 650px; background-color: #111218; border: 1px solid #1f212a; border-radius: 48px; overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.8);">
                
                <tr><td height="6" style="background: linear-gradient(90deg, #BE29EC, #29A6EC, #BE29EC);"></td></tr>
                
                <tr>
                  <td style="padding: 60px 50px;">
                    
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="padding-bottom: 50px;">
                          <img 
                            src="https://res.cloudinary.com/dmtnonxtt/image/upload/v1770382083/wzhjmwclq9chpojzabgj.png" 
                            alt="WishZep" 
                            height="90" 
                            width="auto"
                            style="display: block; border: 0; outline: none; filter: drop-shadow(0 0 10px rgba(41, 166, 236, 0.2));" 
                          />
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                           <p style="margin: 0; font-size: 11px; font-weight: 800; color: #44485e; letter-spacing: 4px; text-transform: uppercase;">Incoming Transmission</p>
                           <h1 style="font-size: 52px; font-weight: 900; letter-spacing: -3px; margin: 20px 0; color: #ffffff; line-height: 0.9;">New <span style="color: #29A6EC;">Request.</span></h1>
                        </td>
                      </tr>
                    </table>

                    <div style="background: rgba(255, 255, 255, 0.03); border-radius: 32px; padding: 40px; margin-top: 20px; border: 1px solid rgba(255, 255, 255, 0.05);">
                      
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom: 25px;">
                            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #BE29EC; text-transform: uppercase; letter-spacing: 1.5px;">Sender Details</p>
                            <p style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800; color: #ffffff;">${name}</p>
                            <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 500; color: #29A6EC;">${email}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 30px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1.5px;">Topic</p>
                            <p style="margin: 8px 0 0 0; font-size: 16px; font-weight: 600; color: #ffffff;">${subject}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 30px;">
                            <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 1.5px;">Inquiry</p>
                            <p style="margin: 0; font-size: 17px; line-height: 1.7; color: #cbd5e0; white-space: pre-wrap;">${message}</p>
                          </td>
                        </tr>
                      </table>

                    </div>

                    <div style="margin-top: 50px; text-align: center;">
                      <a href="mailto:${email}" style="background: linear-gradient(135deg, #BE29EC 0%, #29A6EC 100%); color: #ffffff; padding: 22px 50px; border-radius: 20px; text-decoration: none; font-weight: 800; font-size: 14px; letter-spacing: 1px; display: inline-block; box-shadow: 0 20px 40px rgba(41, 166, 236, 0.3);">ENGAGE CONVERSATION →</a>
                    </div>

                    <p style="margin-top: 70px; font-size: 11px; color: #44485e; text-align: center; line-height: 1.6; letter-spacing: 0.5px;">
                      &copy; 2026 <strong>WishZep</strong> &bull; All Rights Reserved.
                      <br/>
                      This is an encrypted notification from your server.
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

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error: any) {
    console.error('SMTP Error:', error);
    return { 
      success: false, 
      error: 'Dispatch failed. Check SMTP credentials.' 
    };
  }
}
