import nodemailer from 'nodemailer';

const sendTeacherMail = async (email, password, name, loginUrl = 'https://testmaster.webncode.in/login') => {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    const targetUrl = loginUrl || 'https://testmaster.webncode.in/login';
    const displayUrl = 'testmaster.webncode.in';

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Teacher Account Credentials - Test Master Pro',
      html: `<div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e9ecef; border-radius: 8px;">
        <h2 style="color: #333333; margin-top: 0;">Welcome ${name}</h2>
        <p style="color: #666666; font-size: 15px;">Your teacher account is ready. Below are your login credentials:</p>
        <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <p style="margin: 6px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 6px 0;"><strong>Password:</strong> ${password}</p>
          <p style="margin: 6px 0;"><strong>Login Portal:</strong> <a href="${targetUrl}" style="color: #667eea; font-weight: bold; text-decoration: underline;">${displayUrl}</a></p>
        </div>
        <div style="text-align: center; margin: 24px 0 16px;">
          <a href="${targetUrl}" style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px;">Login To Portal</a>
          <p style="margin-top: 10px; font-size: 13px; color: #6c757d;">Website: <a href="${targetUrl}" style="color: #667eea;">https://${displayUrl}</a></p>
        </div>
      </div>`,
    });
  } catch (error) {
    console.error('Failed sending teacher email:', error.message);
  }
};

export default sendTeacherMail;