import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import sanitizeHtml from "sanitize-html";
import { fetchWithTimeout } from "@/lib/server/http";

export type ReaderExtraction = {
  title: string;
  byline?: string;
  contentText: string;
  contentHtml?: string;
};

export async function extractReaderView(url: string): Promise<ReaderExtraction> {
  const response = await fetchWithTimeout(url, {
    headers: { accept: "text/html,application/xhtml+xml" },
  });
  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();

  if (!parsed) {
    return {
      title: dom.window.document.title || url,
      contentText: strip(html),
    };
  }

  return {
    title: parsed.title,
    byline: parsed.byline || undefined,
    contentText: parsed.textContent,
    contentHtml: sanitizeHtml(parsed.content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        "figure",
        "figcaption",
        "pre",
        "code",
        "img",
        "video",
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ["src", "alt", "title", "width", "height", "loading"],
        video: ["src", "controls", "poster"],
        a: ["href", "title", "target", "rel"],
      },
      allowedSchemes: ["http", "https"],
      transformTags: {
        a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noreferrer" }),
      },
    }),
  };
}

function strip(html: string) {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).slice(0, 2000);
}
