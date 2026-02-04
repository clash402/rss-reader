export type Feed = {
  id: string;
  title: string;
  feedUrl: string;
  siteUrl: string;
  tags: string[];
  createdAt: string;
  lastFetchedAt?: string;
  etag?: string;
  lastModified?: string;
};

export type Article = {
  id: string;
  feedId: string;
  title: string;
  url: string;
  author?: string;
  publishedAt?: string;
  snippet?: string;
  contentText?: string;
  contentHtml?: string;
  read: boolean;
  saved: boolean;
};

export type ReaderViewMode = "reader" | "original";

export type ViewFilter = "all" | "saved" | { tag: string };
