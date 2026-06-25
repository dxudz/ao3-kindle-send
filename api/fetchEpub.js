import fetch from "node-fetch";

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing url" });

  // Only allow AO3 downloads to prevent this being used as an open proxy
  if (!url.includes("archiveofourown.org") && !url.includes("download.archiveofourown.org")) {
    return res.status(403).json({ error: "Only AO3 URLs are allowed" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Mimic a browser request so AO3 doesn't block us
        "User-Agent": "Mozilla/5.0 (compatible; KindleSender/3.0)",
        "Accept": "application/epub+zip,*/*",
      },
      redirect: "follow",
    });

    if (!response.ok) throw new Error(`AO3 returned HTTP ${response.status}`);

    const buffer = await response.buffer();
    const b64 = buffer.toString("base64");

    return res.status(200).json({ bytes: b64 });
  } catch (err) {
    console.error("[fetchEpub]", err);
    return res.status(500).json({ error: err.message });
  }
}
