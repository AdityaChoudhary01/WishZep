
'use server';

import nodemailer from 'nodemailer';

/**
 * Server Action to send contact emails via SMTP.
 */
export async function sendContactEmail(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const message = formData.get('message') as string;

  // Validation
  if (!name || !email || !message) {
    return { success: false, error: 'All fields are required.' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'aadiwrld01@gmail.com',
      pass: 'nlmd ijup xarw nkuv',
    },
  });

  const mailOptions = {
    from: email,
    to: 'aadiwrld01@gmail.com',
    subject: `WishZep Contact Form: Message from ${name}`,
    replyTo: email,
    text: `You have a new message from the WishZep Contact Form.\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #primary;">New WishZep Contact Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p style="background: #f9f9f9; padding: 15px; border-radius: 5px;">${message}</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error: any) {
    console.error('Nodemailer Error:', error);
    return { success: false, error: 'Failed to send email. Please try again later.' };
  }
}
