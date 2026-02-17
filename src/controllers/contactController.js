import nodemailer from "nodemailer";
import axios from "axios";
import FormData from "form-data";
import asyncHandler from "../middleware/asyncHandler.js";

const EMAIL_RECIPIENTS = ["mdshoaib018@gmail.com", "danishm856@gmail.com"];
const DEFAULT_WHATSAPP_RECIPIENTS = ["+919654570253", "+917982981354"];
const WHATSBOOST_URL = "https://www.whatsboost.in/api/create-message";
const WHATSBOOST_APPKEY = process.env.WHATSBOOST_APPKEY || "1dc0c778-b719-4a30-9ff0-ce7e68cd1643";
const WHATSBOOST_AUTHKEY = process.env.WHATSBOOST_AUTHKEY || "85llFpgGSQURNYg6VqmnlSra1mjwrNvGLRVLkq8wOPQZKr9trn";
const MAX_WHATSAPP_MESSAGE_LENGTH = 1200;
const WHATSAPP_SEND_RETRIES = Math.max(1, Number(process.env.WHATSAPP_SEND_RETRIES || 3));
const LEAD_MARKER_TEXT = "ye lead aayi h aur lead snipcol ka hai";

const clean = (value = "") => String(value).trim();
const toDigits = (value = "") => String(value).replace(/\D/g, "");
const normalizeIndianPhone = (value = "") => {
  const digits = toDigits(value);
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return value.trim().startsWith("+") ? `+${digits}` : `+${digits}`;
};
const resolveWhatsappRecipients = () => {
  const raw = clean(process.env.WHATSAPP_RECIPIENTS || "");
  const parsed = raw
    ? raw
        .split(",")
        .map((item) => normalizeIndianPhone(item))
        .filter(Boolean)
    : [];
  return parsed.length ? parsed : DEFAULT_WHATSAPP_RECIPIENTS;
};
const WHATSAPP_RECIPIENTS = resolveWhatsappRecipients();

const buildWhatsappNumberVariants = (value = "") => {
  const digits = toDigits(value);
  if (!digits) return [];

  const variants = [];
  if (digits.length === 10) {
    variants.push(`+91${digits}`, `91${digits}`, digits);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    const local = digits.slice(2);
    variants.push(`+${digits}`, digits, local);
  } else if (digits.length > 10) {
    variants.push(`+${digits}`, digits);
  } else {
    variants.push(digits);
  }

  return [...new Set(variants)];
};
const toWhatsappMessage = (message = "") => {
  const text = clean(message);
  if (!text) return "New lead received from snipcol.";
  if (text.length <= MAX_WHATSAPP_MESSAGE_LENGTH) return text;
  return `${text.slice(0, MAX_WHATSAPP_MESSAGE_LENGTH - 16)}\n\n[message trimmed]`;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendWhatsappMessage = async ({ to, message }) => {
  const formData = new FormData();
  formData.append("appkey", WHATSBOOST_APPKEY);
  formData.append("authkey", WHATSBOOST_AUTHKEY);
  formData.append("to", to);
  formData.append("message", toWhatsappMessage(message));

  const response = await axios.post(WHATSBOOST_URL, formData, {
    headers: formData.getHeaders(),
    timeout: 15000,
  });

  const payload = (() => {
    if (typeof response.data !== "string") return response.data;
    try {
      return JSON.parse(response.data);
    } catch (_error) {
      return { message_status: "Failed", raw: response.data };
    }
  })();
  const statusCode = Number(payload?.data?.status_code ?? payload?.status_code ?? 0);
  const messageStatus = String(payload?.message_status || payload?.status || "").toLowerCase();
  const statusCodeLooksValid = statusCode === 0 || statusCode === 200;
  const messageLooksValid = !messageStatus || messageStatus === "success";

  if (!messageLooksValid || !statusCodeLooksValid) {
    throw new Error(`WhatsApp API rejected message for ${to}: ${JSON.stringify(payload)}`);
  }

  console.log(`[contact] WhatsApp sent -> ${to}:`, payload);
  return payload;
};

const sendWhatsappWithFallback = async ({ to, message }) => {
  const candidates = buildWhatsappNumberVariants(to);
  if (!candidates.length) {
    throw new Error(`Invalid WhatsApp number: ${to}`);
  }

  const errors = [];
  for (const candidate of candidates) {
    try {
      const payload = await sendWhatsappMessage({ to: candidate, message });
      return { candidate, payload };
    } catch (error) {
      errors.push(`${candidate} -> ${error.message}`);
    }
  }

  throw new Error(`WhatsApp delivery failed for ${to}. Attempts: ${errors.join(" | ")}`);
};

export const sendContactMessage = asyncHandler(async (req, res) => {
  const name = clean(req.body?.name);
  const email = clean(req.body?.email);
  const company = clean(req.body?.company);
  const phone = normalizeIndianPhone(req.body?.phone || "");
  const subject = clean(req.body?.subject);
  const message = clean(req.body?.message);
  const source = clean(req.body?.source || "website");
  const clientIp =
    req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  // Validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({
      success: false,
      message: "Please provide name, email, subject, and message.",
    });
  }

  const canSendEmail = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  let emailPromise = Promise.resolve("Email skipped (SMTP not configured)");
  console.log(
    `[contact] incoming lead ip=${clientIp} source=${source} email=${email} subject="${subject}" phone=${phone || "NA"}`
  );

  if (canSendEmail) {
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: smtpPort,
      secure: smtpPort === 465, // true for 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

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

    emailPromise = transporter.sendMail(mailOptions);
  } else {
    console.warn("[contact] SMTP missing, skipping email and continuing WhatsApp delivery");
  }

  const whatsappMessage = [
    "SNIPCOL LEAD",
    `Source=${source}`,
    `Name=${name}`,
    `Email=${email}`,
    `Phone=${phone || "NA"}`,
    `Company=${company || "NA"}`,
    `Subject=${subject || "NA"}`,
    `Message=${message}`,
    `LeadTag=${LEAD_MARKER_TEXT}`,
  ].join(" | ");

  const emailResult = await Promise.allSettled([emailPromise]).then((results) => results[0]);
  const whatsappFailures = [];
  let whatsappSuccessCount = 0;
  for (const recipient of WHATSAPP_RECIPIENTS) {
    let sent = false;
    let lastError = null;
    for (let attempt = 1; attempt <= WHATSAPP_SEND_RETRIES; attempt += 1) {
      try {
        console.log(`[contact] WhatsApp attempt ${attempt}/${WHATSAPP_SEND_RETRIES} -> ${recipient}`);
        await sendWhatsappWithFallback({ to: recipient, message: whatsappMessage });
        sent = true;
        whatsappSuccessCount += 1;
        console.log(`[contact] WhatsApp delivered -> ${recipient}`);
        break;
      } catch (error) {
        lastError = error;
        console.warn(
          `[contact] WhatsApp failed attempt ${attempt}/${WHATSAPP_SEND_RETRIES} -> ${recipient}: ${error.message}`
        );
        if (attempt < WHATSAPP_SEND_RETRIES) {
          await sleep(800);
        }
      }
    }
    if (!sent) {
      whatsappFailures.push({ message: lastError?.message || `Unknown WhatsApp error for ${recipient}` });
    }
    await sleep(500);
  }

  const emailFailed = canSendEmail && emailResult.status === "rejected";
  const whatsappRequiredCount = WHATSAPP_RECIPIENTS.length;
  console.log(
    `[contact] summary email=${canSendEmail ? (emailFailed ? "failed" : "sent") : "skipped"} whatsapp=${whatsappSuccessCount}/${whatsappRequiredCount}`
  );

  if (whatsappSuccessCount === 0 && emailFailed) {
    return res.status(500).json({
      success: false,
      message: "Email and WhatsApp delivery failed.",
      emailError: emailResult.reason?.message || "Unknown email error",
      whatsappFailures: whatsappFailures.map((item) => item.message || "Unknown WhatsApp error"),
    });
  }

  if (whatsappSuccessCount < whatsappRequiredCount) {
    return res.status(502).json({
      success: false,
      message: "WhatsApp delivery failed for one or more target numbers.",
      email: canSendEmail ? (emailFailed ? "failed" : "sent") : "skipped",
      whatsapp: `${whatsappSuccessCount}/${whatsappRequiredCount} delivered`,
      whatsappFailures: whatsappFailures.map((item) => item.message || "Unknown WhatsApp error"),
      ...(emailFailed ? { emailError: emailResult.reason?.message || "Unknown email error" } : {}),
    });
  }

  if (emailFailed || !canSendEmail) {
    return res.status(207).json({
      success: true,
      message: "WhatsApp delivered to all targets, but email was partial.",
      email: canSendEmail ? (emailFailed ? "failed" : "sent") : "skipped",
      whatsapp: `${whatsappSuccessCount}/${whatsappRequiredCount} delivered`,
      ...(emailFailed ? { emailError: emailResult.reason?.message || "Unknown email error" } : {}),
    });
  }

  res.status(200).json({
    success: true,
    message: "Your message has been sent successfully on email and WhatsApp.",
    whatsapp: `${whatsappSuccessCount}/${whatsappRequiredCount} delivered`,
    email: canSendEmail ? "sent" : "skipped",
  });
});
