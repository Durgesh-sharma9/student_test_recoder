import nodemailer from 'nodemailer';

const sendTeacherMail = async (email, password, name) => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log(`[mail-disabled] Teacher credentials for ${email}: ${password}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Teacher Account Credentials',
      html: `<div style="font-family: Arial; padding: 16px">
        <h2>Welcome ${name}</h2>
        <p>Your teacher account is ready.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
      </div>`,
    });
  } catch (error) {
    console.error('Failed sending teacher email:', error.message);
  }
};

export default sendTeacherMail;