import nodemailer from "nodemailer";
import asyncHandler from "../middleware/asyncHandler.js";

const EMAIL_RECIPIENTS = ["mdshoaib018@gmail.com", "danishm856@gmail.com"];
const WHATSAPP_RECIPIENTS = ["9654570253", "7982981354"];
const WHATSBOOST_URL = "https://www.whatsboost.in/api/create-message";
const WHATSBOOST_APPKEY = process.env.WHATSBOOST_APPKEY || "1dc0c778-b719-4a30-9ff0-ce7e68cd1643";
const WHATSBOOST_AUTHKEY = process.env.WHATSBOOST_AUTHKEY || "85llFpgGSQURNYg6VqmnlSra1mjwrNvGLRVLkq8wOPQZKr9trn";

const clean = (value = "") => String(value).trim();
const normalizeWhatsappNumber = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

const sendWhatsappMessage = async ({ to, message }) => {
  const formData = new FormData();
  formData.append("appkey", WHATSBOOST_APPKEY);
  formData.append("authkey", WHATSBOOST_AUTHKEY);
  formData.append("to", normalizeWhatsappNumber(to));
  formData.append("message", message);

  const response = await fetch(WHATSBOOST_URL, {
    method: "POST",
    body: formData,
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(`WhatsApp API failed (${response.status}): ${payload}`);
  }
  return payload;
};

export const sendContactMessage = asyncHandler(async (req, res) => {
  const name = clean(req.body?.name);
  const email = clean(req.body?.email);
  const company = clean(req.body?.company);
  const phone = clean(req.body?.phone);
  const subject = clean(req.body?.subject);
  const message = clean(req.body?.message);

  // Validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Please provide name, email, subject, and message.",
    });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({
      success: false,
      message: "SMTP configuration missing on server.",
    });
  }

  // Configure transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 465,
    secure: process.env.SMTP_PORT == 465, // true for 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // Mail content
  const mailOptions = {
    from: `"${name}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to: EMAIL_RECIPIENTS.join(","),
    replyTo: email,
    subject: `New Contact Form Submission: ${subject || "Contact Inquiry"}`,
    html: `
      <h2>New Contact Form Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Company:</strong> ${company || "Not provided"}</p>
      <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <hr>
      <p>${message}</p>
    `,
  };

  const whatsappMessage = [
    "New Contact Form Lead",
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || "Not provided"}`,
    `Company: ${company || "Not provided"}`,
    `Subject: ${subject || "Not provided"}`,
    `Message: ${message}`,
  ].join("\n");

  const tasks = [
    transporter.sendMail(mailOptions),
    ...WHATSAPP_RECIPIENTS.map((to) => sendWhatsappMessage({ to, message: whatsappMessage })),
  ];

  const taskResults = await Promise.allSettled(tasks);
  const emailResult = taskResults[0];
  const whatsappFailures = taskResults.slice(1).filter((result) => result.status === "rejected");

  if (emailResult.status === "rejected") {
    return res.status(500).json({
      success: false,
      message: "Email delivery failed.",
      error: emailResult.reason?.message || "Unknown email error",
    });
  }

  if (whatsappFailures.length > 0) {
    return res.status(207).json({
      success: true,
      message: "Email sent, but one or more WhatsApp deliveries failed.",
      whatsappFailures: whatsappFailures.map((item) => item.reason?.message || "Unknown WhatsApp error"),
    });
  }

  res.status(200).json({
    success: true,
    message: "Your message has been sent successfully on email and WhatsApp.",
  });
});
