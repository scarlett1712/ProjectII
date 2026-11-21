interface WikiSearchHit {
  title: string;
  snippet?: string;
}

/** Search Google News RSS first, then Vietnamese Wikipedia if there are no results. */
export async function searchWeb(query: string) {
  try {
    // Search via Google News RSS for live news, events, weather
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`;
    const res = await fetch(rssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const xml = await res.text();
      const items = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/g)]
        .slice(0, 5)
        .map(m => ({
          title: m[1]?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&')?.replace(/&#39;/g, "'")?.trim(),
          date: m[2]?.trim(),
        }));

      if (items.length > 0) {
        return {
          query,
          found: true,
          source: "Báo chí & Tin tức thời sự Google News",
          articles: items,
        };
      }
    }

    // Wikipedia fallback
    const wikiUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=`;
    const wikiRes = await fetch(wikiUrl, { signal: AbortSignal.timeout(5000) });
    if (wikiRes.ok) {
      const wikiData = await wikiRes.json();
      const snippets = (wikiData.query?.search || []).slice(0, 3).map((s: WikiSearchHit) => ({
        title: s.title,
        snippet: s.snippet?.replace(/<[^>]+>/g, ""),
      }));
      return { query, found: snippets.length > 0, source: "Wikipedia Bách Khoa Toàn Thư", snippets };
    }

    return { query, found: false, message: "Không tìm thấy thông tin phù hợp trên mạng lúc này." };
  } catch (err) {
    console.error("Search web error:", err);
    return { query, error: "Đường truyền tìm kiếm mạng bị chậm hoặc gián đoạn." };
  }
}
