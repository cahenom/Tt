// api/download.js
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type,range");
    return res.status(204).end();
  }

  const src = req.query.src;
  if (!src) return res.status(400).json({ error: "Query ?src= wajib" });

  try {
    const upstream = await fetch(src, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://www.tiktok.com/",
        "Accept": "video/mp4,video/webm,video/*;q=0.9,application/octet-stream;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        // Pass Range header if browser requests seeking
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      },
      redirect: "follow",
    });

    // Forward status & headers penting
    res.status(upstream.status);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
    const ctype = upstream.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", ctype);
    const clen = upstream.headers.get("content-length");
    if (clen) res.setHeader("Content-Length", clen);
    const crange = upstream.headers.get("content-range");
    if (crange) res.setHeader("Content-Range", crange);

    const reader = upstream.body.getReader();
    const encoder = new TextEncoder();
    // Pipe streaming ke res
    res.flushHeaders?.();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (e) {
    res.status(500).json({ error: e.message || "Gagal proxy video" });
  }
}
