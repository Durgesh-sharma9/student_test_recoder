import axios from 'axios';

/**
 * Send Teacher Credentials via WhatsApp Cloud API (Meta API)
 * @param {Object} params
 * @param {string} params.phoneNo - Teacher's WhatsApp mobile number
 * @param {string} params.teacherName - Teacher's full name
 * @param {string} params.email - Teacher's login email
 * @param {string} params.password - Teacher's generated password
 * @param {string} params.schoolName - School name
 * @param {string} params.loginUrl - Portal login URL
 */
export const sendTeacherWhatsAppCredentials = async ({
  phoneNo,
  teacherName,
  email,
  password,
  schoolName,
  loginUrl,
}) => {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token) {
      console.warn('[WhatsApp Service] WHATSAPP_ACCESS_TOKEN is missing in .env. Skipping WhatsApp message.');
      return { success: false, error: 'WHATSAPP_ACCESS_TOKEN is not configured.' };
    }

    if (!phoneNumberId) {
      console.warn('[WhatsApp Service] WHATSAPP_PHONE_NUMBER_ID is missing in .env. Skipping WhatsApp message.');
      return { success: false, error: 'WHATSAPP_PHONE_NUMBER_ID is not configured.' };
    }

    if (!phoneNo) {
      console.warn('[WhatsApp Service] Teacher phone number is missing. Cannot send WhatsApp message.');
      return { success: false, error: 'Teacher phone number is missing.' };
    }

    // Clean phone number: remove non-digits
    let cleanPhone = String(phoneNo).replace(/\D/g, '');
    
    // Format Indian mobile numbers (10 digits) with country code 91
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const targetUrl = loginUrl || 'https://testmaster.webncode.in/login';
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const displaySchool = schoolName && schoolName !== 'Your School' && schoolName !== 'TestMaster Academy'
      ? (schoolName.toLowerCase().includes('test master') ? schoolName : `${schoolName} - Test Master Pro`)
      : 'Test Master Pro';

    const messageText = `🏫 *Welcome to ${displaySchool}!*

Dear *${teacherName}*,
Your Teacher account has been created successfully. Below are your login credentials:

📧 *Email:* ${email}
🔑 *Password:* ${password}
🌐 *Login Portal:* ${targetUrl}

Please keep your login credentials safe and secure.`;

    // 1. If a template is configured, try sending via Template first
    if (templateName) {
      try {
        console.log(`[WhatsApp Service] Sending template '${templateName}' to ${cleanPhone}...`);
        const templatePayload = {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: teacherName },
                  { type: 'text', text: schoolName },
                  { type: 'text', text: email },
                  { type: 'text', text: password },
                ],
              },
            ],
          },
        };

        const response = await axios.post(url, templatePayload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        console.log('[WhatsApp Service] Template message sent successfully:', response.data);
        return { success: true, data: response.data };
      } catch (templateError) {
        console.warn('[WhatsApp Service] Template send failed, attempting direct text message fallback:', templateError.response?.data?.error?.message || templateError.message);
      }
    }

    // 2. Direct text message fallback
    console.log(`[WhatsApp Service] Sending text message to ${cleanPhone}...`);
    const textPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: messageText,
      },
    };

    const response = await axios.post(url, textPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('[WhatsApp Service] Text message sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error('[WhatsApp Service] Error sending WhatsApp message:', errorData);
    return { success: false, error: errorData };
  }
};

/**
 * Send Parent Credentials via WhatsApp Cloud API (Meta API)
 * @param {Object} params
 * @param {string} params.phoneNo - Parent's mobile number
 * @param {string} params.parentName - Parent's name
 * @param {string} [params.email] - Parent's email (optional)
 * @param {string} params.password - Parent's generated password
 * @param {string} params.schoolName - School name
 * @param {string} [params.loginUrl] - Parent login portal URL
 */
export const sendParentWhatsAppCredentials = async ({
  phoneNo,
  parentName,
  email,
  password,
  schoolName,
  loginUrl,
}) => {
  try {
    const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token) {
      console.warn('[WhatsApp Service] WHATSAPP_ACCESS_TOKEN is missing in .env. Skipping Parent WhatsApp message.');
      return { success: false, error: 'WHATSAPP_ACCESS_TOKEN is not configured.' };
    }

    if (!phoneNumberId) {
      console.warn('[WhatsApp Service] WHATSAPP_PHONE_NUMBER_ID is missing in .env. Skipping Parent WhatsApp message.');
      return { success: false, error: 'WHATSAPP_PHONE_NUMBER_ID is not configured.' };
    }

    if (!phoneNo) {
      console.warn('[WhatsApp Service] Parent phone number is missing. Cannot send WhatsApp message.');
      return { success: false, error: 'Parent phone number is missing.' };
    }

    // Clean phone number: remove non-digits
    let cleanPhone = String(phoneNo).replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const targetUrl = (loginUrl && !loginUrl.includes('localhost'))
      ? (loginUrl.endsWith('/parent-login') ? loginUrl : `${loginUrl}/parent-login`)
      : 'https://testmaster.webncode.in/parent-login';

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const displaySchool = schoolName && schoolName !== 'Your School' && schoolName !== 'TestMaster Academy'
      ? (schoolName.toLowerCase().includes('test master') ? schoolName : `${schoolName} - Test Master Pro`)
      : 'Test Master Pro';

    const emailLine = email && email.trim() ? `\n📧 *Email:* ${email.trim()}` : '';

    const messageText = `🏫 *Welcome to ${displaySchool}!*

Dear *${parentName || 'Parent'}*,
Your Parent account has been created successfully to monitor your child's academic progress.

You can log in to the Parent Portal using either your *Mobile Number* or *Email*:
📱 *Mobile / Username:* ${phoneNo}${emailLine}
🔑 *Password:* ${password}
🌐 *Parent Portal:* ${targetUrl}

Please keep your login credentials safe and secure.`;

    const textPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: messageText,
      },
    };

    console.log(`[WhatsApp Service] Sending Parent credentials WhatsApp to ${cleanPhone}...`);

    const response = await axios.post(url, textPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('[WhatsApp Service] Parent WhatsApp message sent successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error('[WhatsApp Service] Error sending Parent WhatsApp message:', errorData);
    return { success: false, error: errorData };
  }
};

