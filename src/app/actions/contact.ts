'use server';

import nodemailer from 'nodemailer';

/**
 * Server Action to send contact emails via SMTP.
 * Uses environment variables for security.
 */
export async function sendContactEmail(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const subject = formData.get('subject') as string || 'General Inquiry';
  const message = formData.get('message') as string;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!name || !email || !message) {
    return { success: false, error: 'All fields are required.' };
  }

  if (!smtpUser || !smtpPass) {
    return { success: false, error: 'Email service not configured.' };
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
    subject: `New Message: ${subject} - ${name}`,
    text: `New message from: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Inter', Helvetica, Arial, sans-serif; color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 600px; background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 40px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.5);">
                <!-- Header Gradient Border -->
                <tr><td height="8" style="background: linear-gradient(90deg, #BE29EC, #29A6EC, #BE29EC);"></td></tr>
                
                <tr>
                  <td style="padding: 50px 40px;">
                    <!-- Brand Section -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="background: linear-gradient(135deg, #BE29EC, #29A6EC); width: 50px; height: 50px; border-radius: 15px; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; color: white;">W</div>
                          <span style="font-size: 24px; font-weight: 900; color: #ffffff; margin-left: 10px; vertical-align: middle;">Wish<span style="color: #29A6EC;">Zep</span></span>
                        </td>
                        <td align="right">
                          <p style="margin: 0; font-size: 10px; font-weight: 900; color: #666; letter-spacing: 2px; text-transform: uppercase;">Website Contact</p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 900; color: #BE29EC;">NEW MESSAGE</p>
                        </td>
                      </tr>
                    </table>

                    <h1 style="font-size: 42px; font-weight: 900; letter-spacing: -2px; margin: 40px 0 10px 0; color: #ffffff; text-transform: uppercase; line-height: 1;">Message <br/><span style="color: #29A6EC;">Received.</span></h1>
                    <p style="font-size: 15px; color: #888; line-height: 1.6; margin: 0 0 40px 0;">You have received a new inquiry through the WishZep contact form. A customer is waiting for your response.</p>

                    <!-- Sender Information Card -->
                    <div style="background: #111; border-radius: 24px; padding: 25px; margin-bottom: 30px; border: 1px solid #1a1a1a;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom: 15px;">
                            <p style="margin: 0; font-size: 10px; font-weight: 900; color: #666; text-transform: uppercase; letter-spacing: 1px;">Customer Name</p>
                            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 900; color: #ffffff;">${name}</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 15px;">
                            <p style="margin: 0; font-size: 10px; font-weight: 900; color: #666; text-transform: uppercase; letter-spacing: 1px;">Email Address</p>
                            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #29A6EC;">${email}</p>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <p style="margin: 0; font-size: 10px; font-weight: 900; color: #666; text-transform: uppercase; letter-spacing: 1px;">Subject</p>
                            <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #ffffff;">${subject}</p>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Message Content Section -->
                    <div style="background: linear-gradient(135deg, rgba(190, 41, 236, 0.08), rgba(41, 166, 236, 0.08)); border: 1px solid rgba(190, 41, 236, 0.3); border-radius: 24px; padding: 30px; position: relative;">
                      <p style="margin: 0 0 15px 0; font-size: 10px; font-weight: 900; color: #BE29EC; text-transform: uppercase; letter-spacing: 2px;">Message Details</p>
                      <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #eee; white-space: pre-wrap;">"${message}"</p>
                    </div>

                    <div style="margin-top: 50px; text-align: center;">
                      <a href="mailto:${email}" style="background: #ffffff; color: #000000; padding: 20px 40px; border-radius: 100px; text-decoration: none; font-weight: 900; font-size: 13px; letter-spacing: 1px; display: inline-block; box-shadow: 0 10px 30px rgba(255, 255, 255, 0.15);">REPLY TO MESSAGE →</a>
                    </div>

                    <p style="margin-top: 60px; font-size: 10px; color: #333; text-align: center; line-height: 1.6; border-top: 1px solid #1a1a1a; padding-top: 30px;">
                      © 2024 WishZep. This is an automated notification from your website's contact interface.
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
      error: 'Message delivery failed. Please check SMTP configuration.' 
    };
  }
}
