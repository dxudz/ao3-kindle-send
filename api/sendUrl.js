import fetch from "node-fetch";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  // === CORS ===
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url, bytes, filename, mode } = req.body;

  // ── Mode: "fetch" — proxy-fetch an AO3 epub and return bytes as base64 ──
  // Called by the extension to bypass AO3's CORS restrictions.
  if (mode === "fetch") {
    if (!url) return res.status(400).json({ error: "Missing url" });
    if (!url.includes("archiveofourown.org")) {
      return res.status(403).json({ error: "Only AO3 URLs are allowed" });
    }
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/epub+zip,*/*" },
        redirect: "follow",
      });
      if (!response.ok) throw new Error(`AO3 returned HTTP ${response.status}`);
      const buffer = await response.buffer();
      return res.status(200).json({ bytes: buffer.toString("base64") });
    } catch (err) {
      console.error("[fetch mode]", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Modes: "send" (default) — email the epub to Kindle ──
  // Accepts either { url, filename } or { bytes (base64), filename }
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
      // Cover-patched epub sent as base64 from the extension
      buffer = Buffer.from(bytes, "base64");
    } else {
      // Original mode: Vercel fetches the URL
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
    console.error("[send mode]", err);
    return res.status(500).json({ error: err.message });
  }
}
