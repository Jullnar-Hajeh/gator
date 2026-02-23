import { XMLParser } from "fast-xml-parser";

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });
  
  const xmlText = await response.text();
  const parser = new XMLParser();
  const parsed = parser.parse(xmlText);

  if (!parsed || !parsed.rss || !parsed.rss.channel) {
    throw new Error("Invalid RSS feed: missing channel");
  }

  const channel = parsed.rss.channel;
  let rawItems = channel.item || [];
  
  // التحقق مما إذا كان العناصر مصفوفة أو كائناً واحداً
  const itemsArray = Array.isArray(rawItems) ? rawItems : [rawItems];
  const items: RSSItem[] = [];

  for (const item of itemsArray) {
    // تصفية العناصر التي تفتقد أي حقول مطلوبة
    if (item.title && item.link && item.description && item.pubDate) {
      items.push({
        title: item.title,
        link: item.link,
        description: item.description,
        pubDate: item.pubDate,
      });
    }
  }

  return {
    channel: {
      title: channel.title || "",
      link: channel.link || "",
      description: channel.description || "",
      item: items,
    },
  };
}
