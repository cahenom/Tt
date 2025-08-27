// api/scrape.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  const { src } = req.query;
  if (!src) return res.status(400).json({ error: "No source provided" });

  try {
    const response = await fetch(src, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36",
      },
    });

    const html = await response.text();

    // Cari JSON TikTok di HTML
    const regex = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/;
    const match = html.match(regex);
    if (!match) return res.status(500).json({ error: "Video data not found" });

    const data = JSON.parse(match[1]);
    const videoData = data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;

    if (!videoData?.video?.playAddr) return res.status(500).json({ error: "Video URL not found" });

    res.json({
      description: videoData.desc || "",
      videoUrl: videoData.video.playAddr,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
