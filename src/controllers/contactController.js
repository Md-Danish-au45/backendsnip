import nodemailer from "nodemailer";
import asyncHandler from "../middleware/asyncHandler.js";

export const sendContactMessage = asyncHandler(async (req, res) => {
  const { name, email, company, phone, subject, message } = req.body;

  // Validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Please provide name, email, subject, and message.",
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
    from: `"${name}" <${process.env.FROM_EMAIL}>`,
    to: process.env.FROM_EMAIL,
    replyTo: email,
    subject: `New Contact Form Submission: ${subject}`,
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

  // Send email
  await transporter.sendMail(mailOptions);

  res.status(200).json({
    success: true,
    message: "Your message has been sent successfully!",
  });
});
