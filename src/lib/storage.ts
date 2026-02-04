import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Article, Feed } from "@/lib/types";

export type ReaderDB = DBSchema & {
  feeds: {
    key: string;
    value: Feed;
    indexes: { "by-created": string; "by-title": string };
  };
  articles: {
    key: string;
    value: Article;
    indexes: {
      "by-feed": string;
      "by-feed-and-date": [string, string | undefined];
      "by-saved": string;
    };
  };
  metadata: {
    key: string;
    value: { key: string; value: unknown };
  };
};

const DB_NAME = "current-reader";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ReaderDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<ReaderDB>(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains("feeds")) {
          const feeds = db.createObjectStore("feeds", { keyPath: "id" });
          feeds.createIndex("by-created", "createdAt");
          feeds.createIndex("by-title", "title");
        }

        if (!db.objectStoreNames.contains("articles")) {
          const articles = db.createObjectStore("articles", { keyPath: "id" });
          articles.createIndex("by-feed", "feedId");
          articles.createIndex("by-feed-and-date", ["feedId", "publishedAt"]);
          articles.createIndex("by-saved", "saved");
        }

        if (!db.objectStoreNames.contains("metadata")) {
          tx?.db.createObjectStore("metadata", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function listFeeds() {
  const db = await getDB();
  return db.getAll("feeds");
}

export async function saveFeed(feed: Feed) {
  const db = await getDB();
  await db.put("feeds", feed);
  return feed;
}

export async function deleteFeed(id: string) {
  const db = await getDB();
  await db.delete("feeds", id);
  const articleKeys = (await db.getAllFromIndex("articles", "by-feed", id)).map(
    (article) => article.id,
  );
  await Promise.all(articleKeys.map((key) => db.delete("articles", key)));
}

export async function listArticles(options?: { feedId?: string; saved?: boolean }) {
  const db = await getDB();
  if (options?.feedId) {
    return db.getAllFromIndex("articles", "by-feed", options.feedId);
  }
  if (options?.saved) {
    return db.getAllFromIndex("articles", "by-saved", true);
  }
  return db.getAll("articles");
}

export async function searchArticles(query: string) {
  const db = await getDB();
  const lower = query.toLowerCase();
  const all = await db.getAll("articles");
  return all.filter((article) => {
    const haystack = [article.title, article.author, article.snippet, article.contentText]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(lower);
  });
}

export async function upsertArticles(articles: Article[]) {
  const db = await getDB();
  const tx = db.transaction("articles", "readwrite");
  await Promise.all(articles.map((article) => tx.store.put(article)));
  await tx.done;
}

export async function updateArticleState(
  id: string,
  updates: Partial<Pick<Article, "read" | "saved">>,
) {
  const db = await getDB();
  const article = await db.get("articles", id);
  if (!article) return null;
  const nextArticle = { ...article, ...updates };
  await db.put("articles", nextArticle);
  return nextArticle;
}

export async function updateArticle(id: string, updates: Partial<Article>) {
  const db = await getDB();
  const article = await db.get("articles", id);
  if (!article) return null;
  const nextArticle = { ...article, ...updates };
  await db.put("articles", nextArticle);
  return nextArticle;
}

export async function setMetadata<T>(key: string, value: T) {
  const db = await getDB();
  await db.put("metadata", { key, value });
}

export async function getMetadata<T>(key: string) {
  const db = await getDB();
  const result = await db.get("metadata", key);
  return (result?.value ?? null) as T | null;
}
