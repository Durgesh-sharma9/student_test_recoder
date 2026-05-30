import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const logEmailError = (error, context) => {
  console.error(`[Email Error - ${context}]:`, error.message);
  if (error.stack) console.error(error.stack);
};

export const sendTeacherCreationEmail = async (schoolName, teacherName, teacherEmail, password) => {
  if (!resend) {
    console.log(`[Resend not configured] Teacher creation email for ${teacherEmail}: Password=${password}`);
    return { success: false, message: 'Resend not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: process.env.MAIL_FROM || 'onboarding@resend.dev',
      to: teacherEmail,
      subject: 'Your Teacher Login Credentials',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to ${schoolName}</h2>
          <p style="color: #666;">Your teacher account has been created successfully.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>School Name:</strong> ${schoolName}</p>
            <p style="margin: 10px 0;"><strong>Teacher Name:</strong> ${teacherName}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${teacherEmail}</p>
            <p style="margin: 10px 0;"><strong>Password:</strong> ${password}</p>
          </div>
          <p style="color: #666;">Please use these credentials to log in to your account.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not request this account, please contact your school administrator.</p>
        </div>
      `,
    });
    return { success: true, data: result };
  } catch (error) {
    logEmailError(error, 'Teacher Creation Email');
    return { success: false, error: error.message };
  }
};

export const sendTeacherAssignmentEmail = async (teacherName, teacherEmail, assignedClasses, assignedSubjects) => {
  if (!resend) {
    console.log(`[Resend not configured] Teacher assignment email for ${teacherEmail}`);
    return { success: false, message: 'Resend not configured' };
  }

  try {
    const classesList = assignedClasses.map(c => `<li>${c}</li>`).join('');
    const subjectsList = assignedSubjects.map(s => `<li>${s}</li>`).join('');

    const result = await resend.emails.send({
      from: process.env.MAIL_FROM || 'onboarding@resend.dev',
      to: teacherEmail,
      subject: 'Your Updated Teaching Assignments',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Teaching Assignments Updated</h2>
          <p style="color: #666;">Dear ${teacherName},</p>
          <p style="color: #666;">Your teaching assignments have been updated.</p>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Teacher Name</h3>
            <p style="color: #666;">${teacherName}</p>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Assigned Classes</h3>
            <ul style="color: #666;">${classesList || '<li>No classes assigned</li>'}</ul>
          </div>

          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Assigned Subjects</h3>
            <ul style="color: #666;">${subjectsList || '<li>No subjects assigned</li>'}</ul>
          </div>

          <p style="color: #666;">Please log in to view your updated assignments.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">If you did not request these changes, please contact your school administrator.</p>
        </div>
      `,
    });
    return { success: true, data: result };
  } catch (error) {
    logEmailError(error, 'Teacher Assignment Email');
    return { success: false, error: error.message };
  }
};
