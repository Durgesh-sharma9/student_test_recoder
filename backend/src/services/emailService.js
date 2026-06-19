import nodemailer from "nodemailer";

// Log SMTP configuration on load
console.log('[Email Service] Initializing email service...');
console.log('[Email Service] SMTP_HOST:', process.env.SMTP_HOST ? 'SET' : 'MISSING');
console.log('[Email Service] SMTP_PORT:', process.env.SMTP_PORT || '587 (default)');
console.log('[Email Service] SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'MISSING');
console.log('[Email Service] SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'MISSING');
console.log('[Email Service] MAIL_FROM:', process.env.MAIL_FROM || process.env.SMTP_USER || 'NOT SET');

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error('[Email Service] CRITICAL: Missing required SMTP configuration!');
  console.error('[Email Service] Email delivery will fail. Please check your .env file.');
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER;

const logEmailError = (error, context, retryAttempt = 0) => {
  console.error(`[Email Error - ${context}]:`, error.message);
  console.error(`[Email Error Details]:`, {
    code: error.code,
    command: error.command,
    responseCode: error.responseCode,
    response: error.response,
    retryAttempt,
  });

  if (error.stack) {
    console.error(error.stack);
  }
};

const logEmailSuccess = (context, recipient, retryAttempt = 0) => {
  console.log(`[Email Success - ${context}]: Email sent successfully to ${recipient}${retryAttempt > 0 ? ` (after ${retryAttempt} retry attempts)` : ''}`);
};

export const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('[Email Service] SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('[Email Service] SMTP connection verification failed:', error.message);
    return false;
  }
};

const sendWithRetry = async (mailOptions, context, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Email Service - ${context}] Retry attempt ${attempt}/${maxRetries}...`);
        // Add delay before retry (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const result = await transporter.sendMail(mailOptions);
      logEmailSuccess(context, mailOptions.to, attempt);
      return { success: true, data: result, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      logEmailError(error, context, attempt);
      
      if (attempt === maxRetries) {
        console.error(`[Email Service - ${context}] Failed after ${maxRetries} retry attempts`);
        break;
      }
    }
  }
  
  return { 
    success: false, 
    error: lastError.message,
    code: lastError.code,
    attempts: maxRetries + 1
  };
};

export const sendTeacherCreationEmail = async (
  schoolName,
  teacherName,
  teacherEmail,
  password,
  loginUrl
) => {
  console.log('[Email Service] Preparing to send teacher creation email');
  console.log('[Email Service] Recipient:', teacherEmail);
  console.log('[Email Service] School:', schoolName);
  console.log('[Email Service] Teacher:', teacherName);
  console.log('[Email Service] MAIL_FROM:', MAIL_FROM);
  console.log('[Email Service] SMTP_HOST:', process.env.SMTP_HOST);
  console.log('[Email Service] SMTP_PORT:', process.env.SMTP_PORT);
  console.log('[Email Service] SMTP_USER:', process.env.SMTP_USER);

  // Verify SMTP configuration before sending
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[Email Service] CRITICAL: Cannot send email - missing SMTP configuration');
    return { 
      success: false, 
      error: 'SMTP configuration is missing. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in environment variables.' 
    };
  }

  // Verify transporter connection
  try {
    const isVerified = await verifyTransporter();
    if (!isVerified) {
      console.error('[Email Service] CRITICAL: SMTP connection verification failed');
      return { 
        success: false, 
        error: 'SMTP connection verification failed. Please check your SMTP credentials and network connection.' 
      };
    }
  } catch (verifyError) {
    console.error('[Email Service] Error during transporter verification:', verifyError.message);
    return { 
      success: false, 
      error: `SMTP verification error: ${verifyError.message}` 
    };
  }

  const mailOptions = {
    from: MAIL_FROM,
    to: teacherEmail,
    subject: `Welcome to ${schoolName} - Your Teacher Account`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${schoolName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 5px; font-weight: 700;">Test Master Pro</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">School Management System</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px; font-weight: 600;">Teacher Account Created Successfully</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
              Hello <strong>${teacherName}</strong>,
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
              Your teacher account has been created successfully.
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
              You can now login to the Test Master Pro portal.
            </p>

            <!-- Credentials Card -->
            <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <h3 style="color: #333333; font-size: 16px; margin: 0 0 20px; font-weight: 600;">Login Details</h3>
              
              <div style="margin-bottom: 15px;">
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 5px; font-weight: 500;">Email</p>
                <p style="color: #212529; font-size: 16px; margin: 0; font-weight: 600;">${teacherEmail}</p>
              </div>
              
              <div style="margin-bottom: 15px;">
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 5px; font-weight: 500;">Temporary Password</p>
                <p style="color: #667eea; font-size: 18px; margin: 0; font-weight: 700; letter-spacing: 1px;">${password}</p>
              </div>
              
              <div style="margin-bottom: 15px;">
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 5px; font-weight: 500;">School</p>
                <p style="color: #212529; font-size: 16px; margin: 0; font-weight: 600;">${schoolName}</p>
              </div>
              
              <div>
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 5px; font-weight: 500;">Role</p>
                <p style="color: #212529; font-size: 16px; margin: 0; font-weight: 600;">Teacher</p>
              </div>
            </div>

            <!-- Security Notice Card -->
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 25px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="color: #856404; font-size: 15px; margin: 0; font-weight: 600;">Security Notice</p>
              <p style="color: #856404; font-size: 14px; margin: 8px 0 0; line-height: 1.5;">
                Please change your password immediately after your first login.
              </p>
            </div>

            <!-- Login Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">Login To Portal</a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 10px;">
                Regards,<br>
                <strong>${schoolName}</strong>
              </p>
              <p style="color: #adb5bd; font-size: 13px; margin: 0;">Powered by Test Master Pro</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to ${schoolName} - Your Teacher Account

Teacher Account Created Successfully

Hello ${teacherName},

Your teacher account has been created successfully.

You can now login to the Test Master Pro portal.

Login Details:
Email: ${teacherEmail}
Temporary Password: ${password}
School: ${schoolName}
Role: Teacher

Security Notice:
Please change your password immediately after your first login.

Login To Portal: ${loginUrl}

Regards,
${schoolName}

Powered by Test Master Pro
    `,
  };

  return await sendWithRetry(mailOptions, "Teacher Creation Email");
};

export const sendTeacherAssignmentEmail = async (
  teacherName,
  teacherEmail,
  assignedClasses = [],
  assignedSubjects = [],
  schoolName = 'Your School',
  loginUrl = ''
) => {
  console.log('[Email Service] Preparing to send teacher assignment email');
  console.log('[Email Service] Recipient:', teacherEmail);
  console.log('[Email Service] Teacher:', teacherName);
  console.log('[Email Service] School:', schoolName);

  const classesList = assignedClasses
    .map((c) => `<li style="color: #212529; font-size: 15px; margin: 8px 0; padding-left: 20px; position: relative;">• ${c}</li>`)
    .join("");

  const subjectsList = assignedSubjects
    .map((s) => `<li style="color: #212529; font-size: 15px; margin: 8px 0; padding-left: 20px; position: relative;">• ${s}</li>`)
    .join("");

  const mailOptions = {
    from: MAIL_FROM,
    to: teacherEmail,
    subject: `Teaching Assignment Updated - ${schoolName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Teaching Assignment Updated</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 5px; font-weight: 700;">Test Master Pro</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0;">School Management System</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px; font-weight: 600;">Teaching Assignment Updated</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
              Hello <strong>${teacherName}</strong>,
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
              Your teaching assignments have been updated.
            </p>

            <!-- Assigned Classes Card -->
            <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <h3 style="color: #333333; font-size: 16px; margin: 0 0 15px; font-weight: 600;">📚 Assigned Classes</h3>
              <ul style="margin: 0; padding: 0; list-style: none;">
                ${classesList || "<li style='color: #6c757d; font-size: 15px;'>No classes assigned</li>"}
              </ul>
            </div>

            <!-- Assigned Subjects Card -->
            <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <h3 style="color: #333333; font-size: 16px; margin: 0 0 15px; font-weight: 600;">📖 Assigned Subjects</h3>
              <ul style="margin: 0; padding: 0; list-style: none;">
                ${subjectsList || "<li style='color: #6c757d; font-size: 15px;'>No subjects assigned</li>"}
              </ul>
            </div>

            <!-- Information Card -->
            <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; margin: 25px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
              <p style="color: #1565c0; font-size: 15px; margin: 0; line-height: 1.6;">
                Please login to your teacher portal to view your latest teaching assignments and responsibilities.
              </p>
            </div>

            <!-- Login Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">Open Teacher Portal</a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e9ecef; padding-top: 20px; margin-top: 30px;">
              <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0 0 10px;">
                Regards,<br>
                <strong>${schoolName}</strong>
              </p>
              <p style="color: #adb5bd; font-size: 13px; margin: 0;">Powered by Test Master Pro</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Teaching Assignment Updated - ${schoolName}

Hello ${teacherName},

Your teaching assignments have been updated.

📚 Assigned Classes
${assignedClasses.length > 0 ? assignedClasses.map(c => `• ${c}`).join('\n') : 'No classes assigned'}

📖 Assigned Subjects
${assignedSubjects.length > 0 ? assignedSubjects.map(s => `• ${s}`).join('\n') : 'No subjects assigned'}

Please login to your teacher portal to view your latest teaching assignments and responsibilities.

Open Teacher Portal: ${loginUrl}

Regards,
${schoolName}

Powered by Test Master Pro
    `,
  };

  return await sendWithRetry(mailOptions, "Teacher Assignment Email");
};

export const sendParentCreationEmail = async (
  schoolName,
  parentName,
  parentEmail,
  password,
  loginUrl
) => {
  console.log('[Email Service] Preparing to send parent creation email');
  console.log('[Email Service] Recipient:', parentEmail);
  console.log('[Email Service] School:', schoolName);
  console.log('[Email Service] Parent:', parentName);

  const mailOptions = {
    from: MAIL_FROM,
    to: parentEmail,
    subject: "Welcome to Test Master - Your Parent Account Credentials",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Test Master</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(255,255,255,0.2); border-radius: 12px; margin-bottom: 15px;">
              <span style="font-size: 32px; color: #ffffff;">👨‍👩‍👧‍👦</span>
            </div>
            <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700;">Test Master</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 5px 0 0;">Professional School Management</p>
          </div>

          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #333333; font-size: 24px; margin: 0 0 10px; font-weight: 600;">Welcome to ${schoolName}!</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
              Hello <strong>${parentName}</strong>,
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
              Your parent account has been successfully created. Below are your login credentials to access the Test Master platform and monitor your child's academic progress.
            </p>

            <!-- Credentials Box -->
            <div style="background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 12px; padding: 25px; margin: 25px 0;">
              <h3 style="color: #495057; font-size: 18px; margin: 0 0 20px; font-weight: 600;">Your Account Details</h3>
              
              <div style="margin-bottom: 15px;">
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 5px; font-weight: 500;">Parent Name</p>
                <p style="color: #212529; font-size: 16px; margin: 0; font-weight: 600;">${parentName}</p>
              </div>
              
              <div style="margin-bottom: 15px;">
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 5px; font-weight: 500;">Email Address</p>
                <p style="color: #212529; font-size: 16px; margin: 0; font-weight: 600;">${parentEmail}</p>
              </div>
              
              <div style="margin-bottom: 15px;">
                <p style="color: #6c757d; font-size: 14px; margin: 0 0 5px; font-weight: 500;">Temporary Password</p>
                <p style="color: #667eea; font-size: 20px; margin: 0; font-weight: 700; letter-spacing: 2px;">${password}</p>
              </div>
              
              <div>
                <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-top: 10px;">Login to Your Account</a>
              </div>
            </div>

            <!-- Important Notice -->
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 25px 0;">
              <p style="color: #856404; font-size: 15px; margin: 0; font-weight: 600;">⚠️ Important Security Notice</p>
              <p style="color: #856404; font-size: 14px; margin: 8px 0 0; line-height: 1.5;">
                This is a temporary password. For your account security, please change your password immediately after your first login from the Settings page.
              </p>
            </div>

            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 25px 0 0;">
              With Test Master, you can:
            </p>
            <ul style="color: #666666; font-size: 15px; line-height: 1.8; margin: 10px 0 25px; padding-left: 20px;">
              <li>View your child's test results and academic performance</li>
              <li>Monitor attendance and progress reports</li>
              <li>Receive important school notifications</li>
              <li>Download report cards and certificates</li>
            </ul>

            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 10px 0;">
              If you have any questions or need assistance, please contact your school administrator.
            </p>

            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 10px 0;">
              Best regards,<br>
              <strong>${schoolName} Team</strong>
            </p>
          </div>

          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
            <p style="color: #6c757d; font-size: 13px; margin: 0 0 10px;">© ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
            <p style="color: #adb5bd; font-size: 12px; margin: 0;">This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  return await sendWithRetry(mailOptions, "Parent Creation Email");
};