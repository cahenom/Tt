// api/download.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const { src } = req.query;
  if (!src) return res.status(400).json({ error: "No video URL provided" });

  try {
    const response = await fetch(src, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36",
      },
    });

    if (!response.ok) return res.status(response.status).send("Failed to fetch video");

    res.setHeader("Content-Type", "video/mp4");
    response.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
