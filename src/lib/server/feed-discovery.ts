import { JSDOM } from "jsdom";
import { fetchWithTimeout } from "@/lib/server/http";

export type DiscoveredFeed = {
  title: string;
  url: string;
  type: string;
};

const FEED_TYPES = ["application/rss+xml", "application/atom+xml", "application/xml", "text/xml"];

export async function discoverFeedsFromUrl(url: string) {
  const response = await fetchWithTimeout(url, {
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  const alternates = Array.from(
    document.querySelectorAll<HTMLLinkElement>("link[rel~='alternate']"),
  );
  const feeds: DiscoveredFeed[] = alternates
    .filter((link) => {
      const type = link.type?.toLowerCase();
      return type ? FEED_TYPES.some((allowed) => type.includes(allowed)) : false;
    })
    .map((link) => ({
      title: link.title || link.href,
      url: new URL(link.href, url).toString(),
      type: link.type || "rss",
    }));

  if (feeds.length) return dedupeFeeds(feeds);

  // fallback: look for anchor tags ending with typical feed extensions
  const anchorFeeds = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((anchor) => anchor.href)
    .filter((href) => /\.(rss|xml|atom)(\?|$)/i.test(href))
    .slice(0, 5)
    .map((href) => ({ title: href, url: new URL(href, url).toString(), type: "rss" }));

  return dedupeFeeds(anchorFeeds);
}

function dedupeFeeds(feeds: DiscoveredFeed[]) {
  const seen = new Map<string, DiscoveredFeed>();
  feeds.forEach((feed) => {
    if (!seen.has(feed.url)) {
      seen.set(feed.url, feed);
    }
  });
  return Array.from(seen.values());
}
