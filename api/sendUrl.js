import fetch from "node-fetch";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Accepts either:
  //   { url, filename }    → fetch epub from URL then email (original behaviour)
  //   { bytes, filename }  → epub already patched; bytes is base64
  const { url, bytes, filename } = req.body;
  if (!filename) return res.status(400).json({ error: "Missing filename" });
  if (!url && !bytes) return res.status(400).json({ error: "Missing url or bytes" });

  const KINDLE_EMAIL       = process.env.KINDLE_EMAIL;
  const GMAIL_USER         = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  try {
    let buffer;
    if (bytes) {
      buffer = Buffer.from(bytes, "base64");
    } else {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) throw new Error(`Failed to fetch EPUB: ${response.status}`);
      buffer = await response.buffer();
    }

    await transporter.sendMail({
      from: GMAIL_USER,
      to: KINDLE_EMAIL,
      subject: "Kindle EPUB",
      text: "Here is your EPUB for Kindle",
      attachments: [{ filename, content: buffer }],
    });

    return res.status(200).json({ message: "EPUB sent to Kindle!" });
  } catch (err) {
    console.error("[sendUrl]", err);
    return res.status(500).json({ error: err.message });
  }
}
