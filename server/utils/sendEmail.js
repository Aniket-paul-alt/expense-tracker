const { Resend } = require('resend');

const sendEmail = async (options) => {
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Note: For free Resend accounts without a verified domain, 
  // you MUST send from 'onboarding@resend.dev'.
  const fromEmail = 'onboarding@resend.dev';

  try {
    const data = await resend.emails.send({
      from: `${process.env.FROM_NAME || 'ExpenseTracker'} <${fromEmail}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    });

    console.log("Resend message sent:", data);
    return data;
  } catch (error) {
    console.error("Resend Error:", error);
    throw error;
  }
};

module.exports = sendEmail;
