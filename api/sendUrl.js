import fetch from "node-fetch";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // === 1️⃣ Always set CORS headers first ===
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // === 2️⃣ Handle OPTIONS preflight immediately ===
  if (req.method === "OPTIONS") {
    return res.status(204).end(); // No content
  }

  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // === 3️⃣ Extract data from request ===
  const { url, filename } = req.body;
  if (!url || !filename) return res.status(400).json({ error: "Missing URL or filename" });

  // === 4️⃣ Set up email transporter ===
  const KINDLE_EMAIL = process.env.KINDLE_EMAIL;
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  // === 5️⃣ Fetch EPUB and send email ===
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch EPUB: ${response.status}`);
    const buffer = await response.buffer();

    await transporter.sendMail({
      from: GMAIL_USER,
      to: KINDLE_EMAIL,
      subject: "Kindle EPUB",
      text: "Here is your EPUB for Kindle",
      attachments: [{ filename, content: buffer }],
    });

    return res.status(200).json({ message: "EPUB sent to Kindle via Node.js!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}