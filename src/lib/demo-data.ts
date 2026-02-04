import type { Article, Feed } from "@/lib/types";

export const demoTags = ["Design", "Engineering", "News", "Indie", "AI"];

export const demoFeeds: Feed[] = [
  {
    id: "densely",
    title: "Dense Discovery",
    feedUrl: "https://www.densediscovery.com/feed",
    siteUrl: "https://www.densediscovery.com",
    tags: ["Design", "Indie"],
    createdAt: new Date().toISOString(),
    lastFetchedAt: new Date().toISOString(),
  },
  {
    id: "strange-loop",
    title: "Stratechery",
    feedUrl: "https://stratechery.com/feed",
    siteUrl: "https://stratechery.com",
    tags: ["News"],
    createdAt: new Date().toISOString(),
    lastFetchedAt: new Date().toISOString(),
  },
  {
    id: "changelog",
    title: "Changelog",
    feedUrl: "https://changelog.com/podcast/feed",
    siteUrl: "https://changelog.com",
    tags: ["Engineering"],
    createdAt: new Date().toISOString(),
    lastFetchedAt: new Date().toISOString(),
  },
];

export const demoArticles: Article[] = [
  {
    id: "changelog-01",
    feedId: "changelog",
    title: "UX patterns from calm apps",
    url: "https://example.com/ux-patterns",
    author: "Jessie Kim",
    publishedAt: new Date().toISOString(),
    snippet:
      "A tour of the interface decisions that make note-taking, reading, and focus apps feel peaceful without sacrificing personality.",
    contentText:
      "Long-form content placeholder that mirrors what an extracted reader mode article might look like once we parse the feed.",
    read: false,
    saved: false,
  },
  {
    id: "dense-02",
    feedId: "densely",
    title: "Ambient interfaces for dense information",
    url: "https://example.com/ambient",
    author: "Kai",
    snippet:
      "What if your feed reader tuned itself to your attention instead of the other way around? Experiments in interface calm.",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    contentText:
      "This placeholder content demonstrates where the extracted reader view renders within the right pane.",
    read: true,
    saved: true,
  },
  {
    id: "stratechery-03",
    feedId: "strange-loop",
    title: "The web is small again",
    url: "https://example.com/small-web",
    author: "Ben",
    snippet:
      "An exploration into why personal sites and newsletters are on the rise, and what tools can make following them joyful again.",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    contentText:
      "Sample reader text to flesh out the UI shell. We'll swap this with real extracted HTML later on.",
    read: false,
    saved: false,
  },
];
