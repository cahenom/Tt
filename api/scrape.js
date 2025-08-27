// api/scrape.js
// Runtime: Vercel Node.js (bukan Edge) agar dapat akses header mentah.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
      "access-control-allow-headers": "content-type",
      "cache-control": "no-store",
    },
  });
}

export default async function handler(req, res) {
  // Vercel Node handler (CommonJS-like) dengan res.json
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    return res.status(204).end();
  }

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Query ?url= wajib" });
  if (!/^https?:\/\/(www\.)?tiktok\.com\//i.test(url)) {
    return res.status(400).json({ error: "URL harus domain tiktok.com" });
  }

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Referer": "https://www.tiktok.com/",
      },
      redirect: "follow",
    });

    const html = await r.text();

    // 1) Pola resmi yang sering dipakai:
    const re1 = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/;
    // 2) Fallback: cari "playAddr":"..."
    const re2 = /"playAddr"\s*:\s*"([^"]+)"/;

    let videoId = null, desc = null, playAddr = null;

    const m1 = html.match(re1);
    if (m1) {
      const jsonStr = m1[1];
      try {
        const data = JSON.parse(jsonStr);
        const v = data?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
        videoId = v?.id || null;
        desc = v?.desc || null;
        playAddr = v?.video?.playAddr || null;
      } catch (_) { /* fallback ke re2 */ }
    }

    if (!playAddr) {
      const m2 = html.match(re2);
      if (m2) {
        // unescape \u0026 menjadi &
        playAddr = m2[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
      }
    }

    if (!playAddr) throw new Error("Tidak menemukan playAddr");

    // Return juga URL proxy agar gampang dipakai di frontend
    return res.status(200).json({
      id: videoId,
      desc,
      videoUrl: playAddr,
      proxyDownload: `/api/download?src=${encodeURIComponent(playAddr)}`,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Gagal memproses" });
  }
}
