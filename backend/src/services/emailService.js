import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const logEmailError = (error, context) => {
  console.error(`[Email Error - ${context}]:`, error.message);

  if (error.stack) {
    console.error(error.stack);
  }
};

export const sendTeacherCreationEmail = async (
  schoolName,
  teacherName,
  teacherEmail,
  password,
  loginUrl
) => {
  try {
    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: teacherEmail,
      subject: "Teacher Login Credentials",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Teacher Account Created</h2>

          <p>Hello ${teacherName},</p>

          <p>Your account has been created successfully for ${schoolName}.</p>

          <div style="background:#f5f5f5;padding:15px;border-radius:8px;">
            <p><strong>Name:</strong> ${teacherName}</p>
            <p><strong>Email:</strong> ${teacherEmail}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p><strong>Login URL:</strong> <a href="${loginUrl}" target="_blank" rel="noreferrer">${loginUrl}</a></p>
          </div>

          <p>Please keep these credentials safe.</p>
        </div>
      `,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logEmailError(error, "Teacher Creation Email");

    return {
      success: false,
      error: error.message,
    };
  }
};

export const sendTeacherAssignmentEmail = async (
  teacherName,
  teacherEmail,
  assignedClasses = [],
  assignedSubjects = []
) => {
  try {
    const classesList = assignedClasses
      .map((c) => `<li>${c}</li>`)
      .join("");

    const subjectsList = assignedSubjects
      .map((s) => `<li>${s}</li>`)
      .join("");

    const result = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: teacherEmail,
      subject: "Teaching Assignments Updated",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Teaching Assignments Updated</h2>

          <p>Hello ${teacherName},</p>

          <h3>Assigned Classes</h3>
          <ul>
            ${classesList || "<li>No classes assigned</li>"}
          </ul>

          <h3>Assigned Subjects</h3>
          <ul>
            ${subjectsList || "<li>No subjects assigned</li>"}
          </ul>
        </div>
      `,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    logEmailError(error, "Teacher Assignment Email");

    return {
      success: false,
      error: error.message,
    };
  }
};