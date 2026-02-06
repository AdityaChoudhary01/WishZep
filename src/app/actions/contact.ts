'use server';

import nodemailer from 'nodemailer';

/**
 * Server Action to send contact emails via SMTP.
 * Uses simple language and the actual brand logo image.
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
                <tr><td height="8" style="background: linear-gradient(90deg, #BE29EC, #29A6EC, #BE29EC);"></td></tr>
                
                <tr>
                  <td style="padding: 50px 40px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle">
                          <img 
                            src="https://res.cloudinary.com/dmtnonxtt/image/upload/v1770382083/wzhjmwclq9chpojzabgj.png" 
                            alt="WishZep" 
                            height="64" 
                            width="auto"
                            style="display: block; border: 0; outline: none;" 
                          />
                        </td>
                        <td align="right" valign="middle">
                          <p style="margin: 0; font-size: 10px; font-weight: 900; color: #666; letter-spacing: 2px; text-transform: uppercase;">Help Center</p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 900; color: #BE29EC;">NEW MESSAGE</p>
                        </td>
                      </tr>
                    </table>

                    <h1 style="font-size: 42px; font-weight: 900; letter-spacing: -2px; margin: 40px 0 10px 0; color: #ffffff; line-height: 1;">We've Got <br/><span style="color: #29A6EC;">Mail.</span></h1>
                    <p style="font-size: 15px; color: #888; line-height: 1.6; margin: 0 0 40px 0;">A customer has sent a message through your website contact form. Here are the details:</p>

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

                    <div style="background: linear-gradient(135deg, rgba(190, 41, 236, 0.08), rgba(41, 166, 236, 0.08)); border: 1px solid rgba(190, 41, 236, 0.3); border-radius: 24px; padding: 30px;">
                      <p style="margin: 0 0 15px 0; font-size: 10px; font-weight: 900; color: #BE29EC; text-transform: uppercase; letter-spacing: 2px;">Message Content</p>
                      <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #eee; white-space: pre-wrap;">"${message}"</p>
                    </div>

                    <div style="margin-top: 50px; text-align: center;">
                      <a href="mailto:${email}" style="background: #ffffff; color: #000000; padding: 20px 40px; border-radius: 100px; text-decoration: none; font-weight: 900; font-size: 13px; letter-spacing: 1px; display: inline-block;">REPLY TO CUSTOMER →</a>
                    </div>

                    <p style="margin-top: 60px; font-size: 10px; color: #333; text-align: center; line-height: 1.6; border-top: 1px solid #1a1a1a; padding-top: 30px;">
                      © 2026 WishZep. This is an automated message from your website contact form.
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
      error: 'Message could not be sent. Please check your settings.' 
    };
  }
}
