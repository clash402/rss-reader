"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Article, Feed } from "@/lib/types";
import { demoArticles, demoFeeds } from "@/lib/demo-data";
import {
  getMetadata,
  listArticles,
  listFeeds,
  saveFeed,
  setMetadata,
  upsertArticles,
  updateArticle,
  updateArticleState,
} from "@/lib/storage";
import type { NormalizedFeedResponse } from "@/lib/server/feed-parser";
import type { ReaderExtraction } from "@/lib/server/reader-extractor";

const DEMO_SEEDED_KEY = "demo-seeded-v1";

type ReaderStoreContextValue = {
  feeds: Feed[];
  articles: Article[];
  tags: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  toggleSaved: (id: string) => Promise<void>;
  toggleRead: (id: string, read?: boolean) => Promise<void>;
  addFeed: (input: { url: string; tags: string[] }) => Promise<void>;
  refreshFeed: (feedId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  isAddingFeed: boolean;
  refreshingFeedIds: string[];
  isRefreshingAll: boolean;
  loadReaderView: (articleId: string) => Promise<void>;
  readerLoadingIds: string[];
};

const ReaderStoreContext = createContext<ReaderStoreContextValue | null>(null);

async function seedDemoContent() {
  await Promise.all(demoFeeds.map((feed) => saveFeed(feed)));
  await upsertArticles(demoArticles);
  await setMetadata(DEMO_SEEDED_KEY, true);
}

export function ReaderStoreProvider({ children }: { children: React.ReactNode }) {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [refreshingFeedIds, setRefreshingFeedIds] = useState<string[]>([]);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [readerLoadingIds, setReaderLoadingIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [storedFeeds, storedArticles] = await Promise.all([listFeeds(), listArticles()]);
      if (!storedFeeds.length) {
        const seeded = await getMetadata<boolean>(DEMO_SEEDED_KEY);
        if (!seeded) {
          await seedDemoContent();
          const [demoSeededFeeds, demoSeededArticles] = await Promise.all([
            listFeeds(),
            listArticles(),
          ]);
          setFeeds(demoSeededFeeds);
          setArticles(sortArticles(demoSeededArticles));
          setLoading(false);
          return;
        }
      }
      setFeeds(storedFeeds);
      setArticles(sortArticles(storedArticles));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSaved = useCallback(
    async (id: string) => {
      const article = articles.find((item) => item.id === id);
      const nextValue = !article?.saved;
      await updateArticleState(id, { saved: nextValue });
      setArticles((prev) =>
        prev.map((item) => (item.id === id ? { ...item, saved: nextValue } : item)),
      );
    },
    [articles],
  );

  const toggleRead = useCallback(
    async (id: string, force?: boolean) => {
      const article = articles.find((item) => item.id === id);
      const nextValue = typeof force === "boolean" ? force : !article?.read;
      await updateArticleState(id, { read: nextValue });
      setArticles((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: nextValue } : item)),
      );
    },
    [articles],
  );

  const loadReaderView = useCallback(
    async (articleId: string) => {
      const article = articles.find((entry) => entry.id === articleId);
      if (!article || !article.url) return;
      if (article.contentText && article.contentText.length > 200) return;
      setReaderLoadingIds((prev) => (prev.includes(articleId) ? prev : [...prev, articleId]));
      try {
        const result = await requestReader({ url: article.url });
        await updateArticle(articleId, {
          contentText: result.contentText,
          contentHtml: result.contentHtml,
        });
        setArticles((prev) =>
          prev.map((entry) =>
            entry.id === articleId
              ? {
                  ...entry,
                  contentText: result.contentText,
                  contentHtml: result.contentHtml,
                }
              : entry,
          ),
        );
      } catch {
        // swallow for now; UI can show fallback text
      } finally {
        setReaderLoadingIds((prev) => prev.filter((id) => id !== articleId));
      }
    },
    [articles],
  );

  const ingestFeed = useCallback(async (result: NormalizedFeedResponse, tags: string[]) => {
    const incomingFeed: Feed = {
      ...result.feed,
      tags,
    };
    await saveFeed(incomingFeed);
    if (result.articles?.length) {
      await upsertArticles(result.articles);
    }
    setFeeds((prev) => mergeFeeds(prev, incomingFeed));
    if (result.articles?.length) {
      setArticles((prev) => mergeArticles(prev, result.articles));
    }
  }, []);

  const addFeed = useCallback(
    async ({ url, tags }: { url: string; tags: string[] }) => {
      setIsAddingFeed(true);
      try {
        const response = await requestFeed({ url });
        await ingestFeed(response, tags);
      } finally {
        setIsAddingFeed(false);
      }
    },
    [ingestFeed],
  );

  const refreshFeed = useCallback(
    async (feedId: string) => {
      const feed = feeds.find((entry) => entry.id === feedId);
      if (!feed) return;
      setRefreshingFeedIds((prev) => (prev.includes(feedId) ? prev : [...prev, feedId]));
      try {
        const response = await requestFeed({
          url: feed.feedUrl,
          etag: feed.etag,
          lastModified: feed.lastModified,
        });
        if (response.notModified) {
          const updated = { ...feed, lastFetchedAt: new Date().toISOString() };
          await saveFeed(updated);
          setFeeds((prev) => prev.map((entry) => (entry.id === feedId ? updated : entry)));
          return;
        }
        await ingestFeed(
          {
            ...response,
            feed: {
              ...response.feed,
              tags: feed.tags,
            },
          },
          feed.tags,
        );
      } finally {
        setRefreshingFeedIds((prev) => prev.filter((id) => id !== feedId));
      }
    },
    [feeds, ingestFeed],
  );

  const refreshAll = useCallback(async () => {
    if (!feeds.length) return;
    setIsRefreshingAll(true);
    try {
      const snapshot = [...feeds];
      for (const feed of snapshot) {
        await refreshFeed(feed.id);
      }
    } finally {
      setIsRefreshingAll(false);
    }
  }, [feeds, refreshFeed]);

  const value = useMemo<ReaderStoreContextValue>(() => {
    const tags = Array.from(new Set(feeds.flatMap((feed) => feed.tags))).sort();
    return {
      feeds,
      articles,
      tags,
      loading,
      refresh: load,
      toggleSaved,
      toggleRead,
      addFeed,
      refreshFeed,
      refreshAll,
      isAddingFeed,
      refreshingFeedIds,
      isRefreshingAll,
      loadReaderView,
      readerLoadingIds,
    };
  }, [
    feeds,
    articles,
    loading,
    load,
    toggleRead,
    toggleSaved,
    addFeed,
    refreshFeed,
    refreshAll,
    isAddingFeed,
    refreshingFeedIds,
    isRefreshingAll,
    loadReaderView,
    readerLoadingIds,
  ]);

  return <ReaderStoreContext.Provider value={value}>{children}</ReaderStoreContext.Provider>;
}

export function useReaderStore() {
  const ctx = useContext(ReaderStoreContext);
  if (!ctx) {
    throw new Error("useReaderStore must be used within ReaderStoreProvider");
  }
  return ctx;
}

function sortArticles(entries: Article[]) {
  return [...entries].sort((a, b) => {
    const left = a.publishedAt ?? a.id;
    const right = b.publishedAt ?? b.id;
    return right.localeCompare(left);
  });
}

function mergeArticles(existing: Article[], incoming: Article[]) {
  const map = new Map(existing.map((article) => [article.id, article]));
  incoming.forEach((article) => {
    const prev = map.get(article.id);
    map.set(article.id, prev ? { ...prev, ...article } : article);
  });
  return sortArticles(Array.from(map.values()));
}

function mergeFeeds(existing: Feed[], feed: Feed) {
  const hasFeed = existing.some((entry) => entry.id === feed.id);
  if (hasFeed) {
    return existing.map((entry) => (entry.id === feed.id ? { ...entry, ...feed } : entry));
  }
  return [...existing, feed];
}

async function requestFeed(body: { url: string; etag?: string; lastModified?: string }) {
  const response = await fetch("/api/feeds", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to parse feed");
  }
  return (await response.json()) as NormalizedFeedResponse;
}

async function requestReader(body: { url: string }) {
  const response = await fetch("/api/reader", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unable to load reader data");
  }
  return (await response.json()) as ReaderExtraction;
}
