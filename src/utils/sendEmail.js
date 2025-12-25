// utils/sendEmail.js (Updated for PDF Attachment support)

import nodemailer from 'nodemailer';

/**
 * Sends an email using the configured SMTP transporter.
 * @param {object} options The email options.
 * @param {string} options.to The recipient's email address.
 * @param {string} options.subject The subject of the email.
 * @param {string} options.text The plain text body of the email.
 * @param {string} [options.html] The HTML body of the email
 * @param {Array<object>} [options.attachments] The array of attachments. ⬅️ NEW
 */
const sendEmail = async (options) => {
  // A transporter object using SMTP transport.
  
  // Best Practice: Use specific environment variables for credentials
  // Ensure you use SMTP_USER/SMTP_PASS in your .env if they differ from SMTP_EMAIL/SMTP_PASSWORD
  const authUser = process.env.SMTP_USER || process.env.SMTP_EMAIL;
  const authPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    // Fix: Port security check is slightly simplified here. 
    // Generally, port 465 is secure (SSL/TLS), others are STARTTLS.
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // Only true for 465
    auth: {
      user: authUser, 
      pass: authPass, 
    },
    tls: {
      // Fix: 'rejectUnauthorized: false' is generally discouraged in production
      // unless you specifically require it for self-signed certs. 
      // Using it ensures connectivity during development/testing.
      rejectUnauthorized: false,
    },
  });

  // Email options.
  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`, // sender address
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    // ✅ ATTACHMENT SUPPORT ADDED
    attachments: options.attachments || [], 
  };

  //Send the email.
  try {
    const info = await transporter.sendMail(mailOptions);
    return info; // Return info on success
  } catch (error) {
    console.error('Error sending email:', error);
    // Rethrow error to be handled by the controller (signAgreement)
    throw new Error(`Failed to send email to ${options.to}.`); 
  }
};

export default sendEmail;