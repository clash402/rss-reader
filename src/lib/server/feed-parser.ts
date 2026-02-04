import crypto from "node:crypto";
import Parser, { Item as RSSItem } from "rss-parser";
import sanitizeHtml from "sanitize-html";
import type { Article, Feed } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/server/http";

const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["dc:creator", "creator"],
    ],
  },
});

export type NormalizedFeedResponse = {
  feed: Feed;
  articles: Article[];
  notModified?: boolean;
};

export async function fetchAndParseFeed(
  url: string,
  options?: { etag?: string; lastModified?: string },
) {
  const headers: Record<string, string> = {};
  if (options?.etag) headers["if-none-match"] = options.etag;
  if (options?.lastModified) headers["if-modified-since"] = options.lastModified;

  const response = await fetchWithTimeout(url, { headers });
  if (response.status === 304) {
    return { notModified: true } satisfies Pick<NormalizedFeedResponse, "notModified">;
  }

  const body = await response.text();
  const parsed = await parser.parseString(body);
  const feedId = hashId(url);
  const siteUrl = parsed.link ?? getOrigin(url);
  const timestamp = new Date().toISOString();

  const feed: Feed = {
    id: feedId,
    title: parsed.title || siteUrl,
    feedUrl: url,
    siteUrl,
    tags: [],
    createdAt: timestamp,
    lastFetchedAt: timestamp,
    etag: response.headers.get("etag") ?? undefined,
    lastModified: response.headers.get("last-modified") ?? undefined,
  };

  const articles = (parsed.items ?? []).map((item) => normalizeItem(item, feedId));

  return {
    feed,
    articles,
    notModified: false,
  } satisfies NormalizedFeedResponse;
}

function normalizeItem(item: RSSItem, feedId: string): Article {
  const publishedAt = item.isoDate ?? item.pubDate ?? new Date().toISOString();
  const articleId = hashId(`${feedId}:${item.guid ?? item.link ?? item.title ?? publishedAt}`);
  const snippet =
    item.contentSnippet || stripHtml(item.contentEncoded || item.content || "").slice(0, 280);
  const contentHtml = item.contentEncoded || item.content || null;
  const enrichedItem = item as RSSItem & { creator?: string };

  return {
    id: articleId,
    feedId,
    title: item.title || "Untitled",
    url: item.link || "",
    author: enrichedItem.creator || item.author || undefined,
    publishedAt,
    snippet,
    contentText: stripHtml(contentHtml ?? ""),
    contentHtml: contentHtml ? sanitize(contentHtml) : undefined,
    read: false,
    saved: false,
  };
}

function hashId(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function stripHtml(input: string) {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}

function sanitize(input: string) {
  return sanitizeHtml(input, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "figure",
      "figcaption",
      "pre",
      "code",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
      a: ["href", "title", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noreferrer" }),
    },
  });
}

function getOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}
