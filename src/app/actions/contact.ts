'use server';

import nodemailer from 'nodemailer';

/**
 * Server Action to send contact emails via SMTP.
 * Uses environment variables for security.
 */
export async function sendContactEmail(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
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
    subject: `WishZep Contact Form: ${name}`,
    text: `New message from: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `
      <div style="font-family: sans-serif; padding: 40px; background-color: #f8f9fa; color: #212529;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); border: 1px solid #eee;">
          <h2 style="color: #BE29EC; font-size: 24px; margin-bottom: 24px; font-weight: 900; letter-spacing: -0.5px;">NEW WISHZEP INQUIRY</h2>
          <hr style="border: none; border-top: 1px solid #eee; margin-bottom: 24px;">
          <div style="margin-bottom: 20px;">
            <p style="font-size: 12px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 4px;">Sender Name</p>
            <p style="font-size: 16px; margin: 0; font-weight: 600;">${name}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <p style="font-size: 12px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 4px;">Email Address</p>
            <p style="font-size: 16px; margin: 0; font-weight: 600; color: #29A6EC;">${email}</p>
          </div>
          <div style="margin-top: 32px; padding: 24px; background: #fdfdfd; border-radius: 16px; border: 1px solid #f0f0f0; border-left: 6px solid #BE29EC;">
            <p style="font-size: 12px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 8px;">Message Content</p>
            <p style="font-size: 16px; line-height: 1.6; margin: 0;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          <p style="margin-top: 40px; font-size: 11px; color: #bbb; text-align: center;">This is an automated delivery from the WishZep Contact Engine.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: 'Message delivery failed. Please check SMTP configuration.' 
    };
  }
}
