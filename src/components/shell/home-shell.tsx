"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Article, Feed } from "@/lib/types";
import { cn, formatDate, truncate } from "@/lib/utils";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagChip } from "@/components/ui/tag-chip";
import {
  IconBookmark,
  IconCheck,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSparkle,
} from "@/components/icons";
import { useReaderStore } from "@/lib/reader-store";
import type { DiscoveredFeed } from "@/lib/server/feed-discovery";
import { toast } from "sonner";
import { useSwipeable } from "react-swipeable";

const views = [
  { id: "all", label: "All" },
  { id: "saved", label: "Saved" },
  { id: "tags", label: "Tags" },
] as const;

type ViewID = (typeof views)[number]["id"];
const FALLBACK_PUBLISHED_AT = new Date("2025-01-01T12:00:00.000Z").toISOString();

export function HomeShell() {
  const {
    feeds,
    articles,
    tags,
    loading,
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
  } = useReaderStore();
  const [activeView, setActiveView] = useState<ViewID>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeFeed, setActiveFeed] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [addFeedOpen, setAddFeedOpen] = useState(false);

  const resolvedFeedId = useMemo(() => {
    if (activeFeed && feeds.some((feed) => feed.id === activeFeed)) {
      return activeFeed;
    }
    return feeds[0]?.id ?? null;
  }, [activeFeed, feeds]);

  const filteredFeeds = useMemo(() => {
    if (!activeTag) return feeds;
    return feeds.filter((feed) => feed.tags.includes(activeTag));
  }, [feeds, activeTag]);

  const filteredArticles = useMemo(() => {
    let list: Article[] = articles;

    if (resolvedFeedId) {
      list = list.filter((article) => article.feedId === resolvedFeedId);
    }

    if (activeView === "saved") {
      list = list.filter((article) => article.saved);
    }

    if (activeTag) {
      const feedIds = new Set(
        feeds.filter((feed) => feed.tags.includes(activeTag)).map((feed) => feed.id),
      );
      list = list.filter((article) => feedIds.has(article.feedId));
    }

    if (query.trim()) {
      const lower = query.toLowerCase();
      list = list.filter(
        (article) =>
          article.title.toLowerCase().includes(lower) ||
          article.snippet?.toLowerCase().includes(lower) ||
          article.author?.toLowerCase().includes(lower),
      );
    }

    return list;
  }, [articles, resolvedFeedId, activeTag, activeView, feeds, query]);

  const resolvedArticleId = useMemo(() => {
    if (activeArticle && filteredArticles.some((article) => article.id === activeArticle)) {
      return activeArticle;
    }
    return filteredArticles[0]?.id ?? null;
  }, [activeArticle, filteredArticles]);

  const selectedArticle =
    filteredArticles.find((article) => article.id === resolvedArticleId) ?? filteredArticles[0];
  const readerLoading =
    selectedArticle?.id != null ? readerLoadingIds.includes(selectedArticle.id) : false;
  const selectedArticleId = selectedArticle?.id;
  const selectedArticleUrl = selectedArticle?.url;
  const selectedArticleContent = selectedArticle?.contentText;

  useEffect(() => {
    if (!selectedArticleId || !selectedArticleUrl) return;
    if (selectedArticleContent && selectedArticleContent.length > 200) return;
    void loadReaderView(selectedArticleId);
  }, [selectedArticleId, selectedArticleUrl, selectedArticleContent, loadReaderView]);

  const handleToggleSaved = useCallback(
    async (articleId: string) => {
      const article = articles.find((entry) => entry.id === articleId);
      const nextValue = !article?.saved;
      await toggleSaved(articleId);
      const description = article?.title ?? "Article updated";
      if (nextValue) {
        toast.success("Saved for later", { description });
      } else {
        toast("Removed from Saved", { description });
      }
    },
    [articles, toggleSaved],
  );

  const handleToggleRead = useCallback(
    async (articleId: string, force?: boolean) => {
      const article = articles.find((entry) => entry.id === articleId);
      const nextValue = typeof force === "boolean" ? force : !article?.read;
      await toggleRead(articleId, force);
      toast.success(nextValue ? "Marked as read" : "Marked as unread", {
        description: article?.title ?? "Updated entry",
      });
    },
    [articles, toggleRead],
  );

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      if (!filteredArticles.length) return;
      const currentIndex = filteredArticles.findIndex(
        (article) => article.id === resolvedArticleId,
      );
      const safeIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + filteredArticles.length) % filteredArticles.length;
      const nextArticle = filteredArticles[safeIndex];
      if (!nextArticle) return;
      setActiveArticle(nextArticle.id);
      setActiveFeed(nextArticle.feedId);
    },
    [filteredArticles, resolvedArticleId, setActiveArticle, setActiveFeed],
  );

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!selectedArticleId) return;

      if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        void handleToggleSaved(selectedArticleId);
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        void handleToggleRead(selectedArticleId);
      } else if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection(1);
      } else if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(-1);
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [selectedArticleId, handleToggleSaved, handleToggleRead, moveSelection]);

  const handleAddFeedSubmit = useCallback(
    async (payload: { url: string; tags: string[] }) => {
      await addFeed(payload);
      toast.success("Feed added", { description: payload.url });
    },
    [addFeed],
  );

  const currentFeedRefreshing = resolvedFeedId ? refreshingFeedIds.includes(resolvedFeedId) : false;

  return (
    <div className="flex min-h-screen flex-col bg-[rgb(var(--background))] px-4 py-6 text-sm text-[rgb(var(--foreground))] sm:px-6 lg:px-10">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">
            CURRENT
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Personal RSS reader</h1>
        </div>
        <Button
          className="hidden sm:inline-flex"
          variant="secondary"
          icon={<IconSparkle />}
          disabled
        >
          Sync coming soon
        </Button>
      </header>

      <div className="flex flex-1 flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-[320px]">
          <Panel className="flex h-full flex-col gap-6 rounded-[32px] border-[rgb(var(--border))]/70 bg-[rgb(var(--surface))]/95 p-5 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-[rgb(var(--muted-foreground))]">
                  Feeds
                </p>
                <p className="text-lg font-semibold">Your mix</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]">
                <IconSparkle />
              </div>
            </div>
            <Button
              variant="primary"
              icon={<IconPlus />}
              size="lg"
              onClick={() => setAddFeedOpen(true)}
              disabled={loading}
            >
              Add feed
            </Button>

            <div>
              <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">
                <span>Tags</span>
                <button className="text-[rgb(var(--accent))]">Manage</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <TagChip
                  active={!activeTag && activeView !== "tags"}
                  onClick={() => setActiveTag(null)}
                >
                  All collections
                </TagChip>
                {tags.map((tag) => (
                  <TagChip
                    key={tag}
                    active={activeTag === tag}
                    onClick={() => {
                      setActiveTag((prev) => (prev === tag ? null : tag));
                      setActiveView("tags");
                    }}
                  >
                    {tag}
                  </TagChip>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">
              <span>Feeds</span>
              <button
                className="flex items-center gap-1 text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
                onClick={() => {
                  void refreshAll();
                }}
                disabled={isRefreshingAll}
              >
                <IconRefresh /> {isRefreshingAll ? "Refreshing…" : "Refresh all"}
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {loading ? (
                <FeedSkeletonList />
              ) : filteredFeeds.length > 0 ? (
                filteredFeeds.map((feed) => (
                  <FeedRow
                    key={feed.id}
                    feed={feed}
                    active={feed.id === resolvedFeedId}
                    refreshing={refreshingFeedIds.includes(feed.id)}
                    onClick={() => {
                      setActiveFeed(feed.id);
                      setActiveArticle(null);
                      setActiveView("all");
                    }}
                    onRefresh={() => {
                      void refreshFeed(feed.id);
                    }}
                  />
                ))
              ) : (
                <EmptyState
                  title="No feeds yet"
                  description="Add a site or feed URL to start reading."
                />
              )}
            </div>
          </Panel>
        </aside>

        <section className="flex-1">
          <div className="mb-3 flex items-center gap-2 rounded-[30px] border border-[rgb(var(--border))]/70 bg-[rgb(var(--surface))] p-1 text-sm">
            {views.map((view) => (
              <button
                key={view.id}
                className={cn(
                  "flex-1 rounded-[24px] px-4 py-2 font-medium transition",
                  activeView === view.id
                    ? "bg-[rgb(var(--surface-elevated))] text-[rgb(var(--foreground))] shadow-[inset_0_-1px_0_rgba(15,23,42,0.08)]"
                    : "text-[rgb(var(--muted-foreground))]",
                )}
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-[rgb(var(--border))]/70 bg-[rgb(var(--surface))] px-3 py-1.5">
              <IconSearch />
              <Input
                className="border-none bg-transparent px-0 text-sm shadow-none"
                placeholder="Search titles, authors, snippets"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              icon={<IconRefresh />}
              className="hidden sm:inline-flex"
              disabled={currentFeedRefreshing || isRefreshingAll}
              onClick={() => {
                if (resolvedFeedId) {
                  void refreshFeed(resolvedFeedId);
                } else {
                  void refreshAll();
                }
              }}
            >
              {currentFeedRefreshing || isRefreshingAll ? "Refreshing…" : "Refresh"}
            </Button>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              Tip: J/K to browse, S to save, R to toggle read
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
            <Panel className="flex max-h-[70vh] flex-col overflow-hidden rounded-[32px] p-0">
              <div className="flex items-center justify-between px-5 pb-4 pt-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">
                    Articles
                  </p>
                  <p className="text-lg font-semibold">
                    {activeView === "saved" ? "Saved for later" : "Latest"}
                  </p>
                </div>
                <Button variant="secondary" className="hidden lg:inline-flex" size="sm">
                  Filter
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <ArticleSkeletonList />
                ) : filteredArticles.length === 0 ? (
                  <EmptyState
                    title={query ? "No matches" : "Nothing yet"}
                    description={
                      query
                        ? "Try another keyword or clear the search."
                        : "Once your feeds refresh, new articles will land here."
                    }
                  />
                ) : (
                  <ul className="divide-y divide-[rgb(var(--border))]/60">
                    {filteredArticles.map((article) =>
                      (() => {
                        const feed = feeds.find((entry) => entry.id === article.feedId);
                        if (!feed) return null;
                        return (
                          <ArticleRow
                            key={article.id}
                            article={article}
                            feed={feed}
                            active={article.id === selectedArticle?.id}
                            onSelect={() => setActiveArticle(article.id)}
                            onToggleSaved={() => handleToggleSaved(article.id)}
                            onToggleRead={() => handleToggleRead(article.id)}
                          />
                        );
                      })(),
                    )}
                  </ul>
                )}
              </div>
            </Panel>

            <Panel className="min-h-[420px] rounded-[32px] border-[rgb(var(--border))]/80 bg-[rgb(var(--surface-elevated))]/70 p-6">
              {loading && !selectedArticle ? (
                <ReaderSkeleton />
              ) : selectedArticle ? (
                (() => {
                  const feed = feeds.find((entry) => entry.id === selectedArticle.feedId);
                  if (!feed) {
                    return (
                      <EmptyState
                        title="Feed missing"
                        description="This article references a feed that was removed."
                      />
                    );
                  }
                  return (
                    <ArticleDetail
                      article={selectedArticle}
                      feed={feed}
                      onToggleSaved={() => handleToggleSaved(selectedArticle.id)}
                      onToggleRead={(force?: boolean) =>
                        handleToggleRead(selectedArticle.id, force)
                      }
                      isLoading={readerLoading}
                    />
                  );
                })()
              ) : (
                <EmptyState
                  title="Choose an article"
                  description="Select a story to open the reader view."
                />
              )}
            </Panel>
          </div>
        </section>
      </div>
      <AddFeedSheet
        open={addFeedOpen}
        onClose={() => setAddFeedOpen(false)}
        onSubmit={handleAddFeedSubmit}
        isSubmitting={isAddingFeed}
        availableTags={tags}
      />
    </div>
  );
}

function FeedRow({
  feed,
  active,
  onClick,
  onRefresh,
  refreshing,
}: {
  feed: Feed;
  active: boolean;
  onClick: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))]/40",
        active
          ? "border-[rgb(var(--accent))]/70 bg-[rgb(var(--surface-elevated))] text-[rgb(var(--foreground))]"
          : "border-transparent bg-[rgb(var(--muted))/0.4] hover:bg-[rgb(var(--muted))/0.6]",
      )}
    >
      <div>
        <p className="text-sm font-medium">{feed.title}</p>
        <p className="text-xs text-[rgb(var(--muted-foreground))]">{getHostname(feed.siteUrl)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-[rgb(var(--muted-foreground))]">
          {refreshing ? "Syncing" : (feed.tags[0] ?? "")}
        </span>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgb(var(--border))]/80 text-[rgb(var(--muted-foreground))]"
          onClick={(event) => {
            event.stopPropagation();
            onRefresh();
          }}
          disabled={refreshing}
        >
          <IconRefresh />
          <span className="sr-only">Refresh feed</span>
        </button>
      </div>
    </article>
  );
}

function ArticleRow({
  article,
  feed,
  active,
  onSelect,
  onToggleSaved,
  onToggleRead,
}: {
  article: Article;
  feed: Feed;
  active: boolean;
  onSelect: () => void;
  onToggleSaved: () => Promise<void> | void;
  onToggleRead: () => Promise<void> | void;
}) {
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      void onToggleSaved();
    },
    onSwipedRight: () => {
      void onToggleRead();
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  return (
    <li>
      <article
        {...swipeHandlers}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          } else if (event.key === "s" || event.key === "S") {
            event.preventDefault();
            void onToggleSaved();
          } else if (event.key === "r" || event.key === "R") {
            event.preventDefault();
            void onToggleRead();
          }
        }}
        aria-pressed={active}
        aria-label={`${article.title}. Swipe right to toggle read, left to save.`}
        className={cn(
          "flex w-full flex-col gap-2 px-5 py-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent))]/40",
          active
            ? "bg-[rgb(var(--surface-elevated))]"
            : "hover:bg-[rgb(var(--surface-elevated))]/50",
        )}
      >
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-[rgb(var(--muted-foreground))]">{feed.title}</span>
          <span className="text-[rgb(var(--muted-foreground))]">
            {formatDate(article.publishedAt ?? FALLBACK_PUBLISHED_AT)}
          </span>
        </div>
        <p className="text-base font-semibold leading-tight">{article.title}</p>
        {article.snippet && (
          <p className="text-sm text-[rgb(var(--muted-foreground))]">{truncate(article.snippet)}</p>
        )}
        <div className="flex items-center justify-between gap-3 text-xs text-[rgb(var(--muted-foreground))]">
          <div className="flex items-center gap-3">
            <span>{article.author ?? "Unknown"}</span>
            <Dot />
            <span>{article.saved ? "Saved" : article.read ? "Read" : "Unread"}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleRead();
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-[rgb(var(--muted-foreground))]",
                article.read
                  ? "border-[rgb(var(--accent))]/60 bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]"
                  : "border-[rgb(var(--border))]/80 hover:text-[rgb(var(--foreground))]",
              )}
            >
              <IconCheck />
              <span className="sr-only">{article.read ? "Mark unread" : "Mark read"}</span>
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onToggleSaved();
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-[rgb(var(--muted-foreground))]",
                article.saved
                  ? "border-[rgb(var(--accent))]/60 bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))]"
                  : "border-[rgb(var(--border))]/80 hover:text-[rgb(var(--foreground))]",
              )}
              aria-pressed={article.saved}
            >
              <IconBookmark filled={article.saved} />
              <span className="sr-only">
                {article.saved ? "Remove from saved" : "Save for later"}
              </span>
            </button>
          </div>
        </div>
      </article>
    </li>
  );
}

function ArticleDetail({
  article,
  feed,
  onToggleSaved,
  onToggleRead,
  isLoading,
}: {
  article: Article;
  feed: Feed;
  onToggleSaved: () => void;
  onToggleRead: (force?: boolean) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">
            Reader
          </p>
          <h2 className="text-2xl font-semibold leading-snug">{article.title}</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<IconCheck />}
            onClick={() => onToggleRead(!article.read)}
          >
            {article.read ? "Mark unread" : "Mark read"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<IconBookmark filled={article.saved} />}
            onClick={onToggleSaved}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (article.url) {
                window.open(article.url, "_blank", "noopener,noreferrer");
              }
            }}
          >
            Open original
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-[rgb(var(--muted-foreground))]">
        <span className="font-medium text-[rgb(var(--foreground))]">{feed.title}</span>
        <Dot />
        <span>{article.author ?? "Unknown author"}</span>
        <Dot />
        <span>{formatDate(article.publishedAt ?? FALLBACK_PUBLISHED_AT)}</span>
      </div>
      <div className="prose prose-sm max-w-none text-[rgb(var(--foreground))] prose-headings:text-[rgb(var(--foreground))] prose-p:text-[rgb(var(--foreground))] dark:prose-invert">
        {isLoading ? (
          <p className="text-[rgb(var(--muted-foreground))]">Extracting reader view…</p>
        ) : article.contentHtml ? (
          <div dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
        ) : (
          <p>{article.contentText ?? article.snippet ?? "Reader view placeholder."}</p>
        )}
        {!isLoading && !article.contentHtml && !article.contentText && (
          <p className="text-[rgb(var(--muted-foreground))]">
            We’ll show a clean reader view once we can extract the article content.
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--muted))/0.6] text-[rgb(var(--accent))]">
        <IconSparkle />
      </div>
      <p className="text-base font-semibold">{title}</p>
      <p className="text-sm text-[rgb(var(--muted-foreground))]">{description}</p>
    </div>
  );
}

function Dot() {
  return <span className="text-[rgb(var(--muted-foreground))]">•</span>;
}

function getHostname(siteUrl?: string) {
  if (!siteUrl) return "Unknown";
  try {
    return new URL(siteUrl).hostname.replace(/^www\./, "");
  } catch {
    return siteUrl;
  }
}

type AddFeedSheetProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { url: string; tags: string[] }) => Promise<void>;
  isSubmitting: boolean;
  availableTags: string[];
};

function AddFeedSheet({ open, onClose, onSubmit, isSubmitting, availableTags }: AddFeedSheetProps) {
  const [url, setUrl] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoveredFeeds, setDiscoveredFeeds] = useState<DiscoveredFeed[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setUrl("");
      setDiscovering(false);
      setDiscoveredFeeds([]);
      setSelectedTags([]);
      setTagInput("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const commitTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag) return;
    setSelectedTags((prev) => (prev.includes(nextTag) ? prev : [...prev, nextTag]));
    setTagInput("");
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag],
    );
  };

  const handleDiscover = async () => {
    if (!url) {
      setError("Add a site URL to discover feeds.");
      return;
    }
    setDiscovering(true);
    setError(null);
    try {
      const response = await fetch("/api/feeds/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as { feeds?: DiscoveredFeed[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to discover feeds");
      }
      setDiscoveredFeeds(data.feeds ?? []);
      if (data.feeds?.length) {
        setUrl(data.feeds[0].url);
      }
    } catch (discoverError) {
      setError(discoverError instanceof Error ? discoverError.message : "Unable to discover feeds");
    } finally {
      setDiscovering(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!url) {
      setError("Please paste a feed or site URL.");
      return;
    }
    setError(null);
    try {
      await onSubmit({ url: url.trim(), tags: selectedTags });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add feed");
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div
        className="w-full max-w-lg rounded-[32px] border border-[rgb(var(--border))]/70 bg-[rgb(var(--surface))] p-6 shadow-[0_25px_60px_-40px_rgba(15,23,42,0.8)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[rgb(var(--muted-foreground))]">
              Add feed
            </p>
            <h2 className="text-2xl font-semibold">Bring a site or RSS link</h2>
          </div>
          <button
            onClick={onClose}
            className="text-sm text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
          >
            Close
          </button>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
              Feed or website URL
            </label>
            <Input
              placeholder="https://example.com/feed or https://example.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
            <div className="mt-2 flex justify-between text-xs text-[rgb(var(--muted-foreground))]">
              <button
                type="button"
                className="text-[rgb(var(--accent))]"
                onClick={handleDiscover}
                disabled={discovering}
              >
                {discovering ? "Looking…" : "Auto-discover feeds"}
              </button>
            </div>
          </div>

          {discoveredFeeds.length > 0 && (
            <div className="rounded-2xl border border-[rgb(var(--border))]/80 bg-[rgb(var(--surface-elevated))]">
              <p className="px-4 pt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
                Found feeds
              </p>
              <div className="divide-y divide-[rgb(var(--border))]/70">
                {discoveredFeeds.map((feed) => (
                  <label
                    key={feed.url}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3"
                  >
                    <input
                      type="radio"
                      name="discovered-feed"
                      value={feed.url}
                      checked={url === feed.url}
                      onChange={(event) => setUrl(event.target.value)}
                    />
                    <div>
                      <p className="text-sm font-medium">{feed.title}</p>
                      <p className="text-xs text-[rgb(var(--muted-foreground))]">{feed.url}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--muted-foreground))]">
              Tags (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <TagChip key={tag} active onClick={() => toggleTag(tag)}>
                  {tag}
                </TagChip>
              ))}
            </div>
            <Input
              className="mt-2"
              placeholder="Type a tag and press Enter"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitTag();
                }
              }}
            />
            {availableTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <TagChip
                    key={tag}
                    active={selectedTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </TagChip>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add feed"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FeedSkeletonList() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-14 w-full animate-pulse rounded-2xl border border-[rgb(var(--border))]/60 bg-[rgb(var(--muted))]/40"
        />
      ))}
    </div>
  );
}

function ArticleSkeletonList() {
  return (
    <ul className="divide-y divide-[rgb(var(--border))]/50">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index} className="animate-pulse px-5 py-5">
          <div className="mb-2 h-3 w-24 rounded-full bg-[rgb(var(--muted))]/60" />
          <div className="mb-2 h-4 w-3/4 rounded-full bg-[rgb(var(--muted))]/50" />
          <div className="h-3 w-1/2 rounded-full bg-[rgb(var(--muted))]/40" />
        </li>
      ))}
    </ul>
  );
}

function ReaderSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-6 w-2/3 animate-pulse rounded-full bg-[rgb(var(--muted))]/50" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-3 w-full animate-pulse rounded-full bg-[rgb(var(--muted))]/40"
          />
        ))}
      </div>
    </div>
  );
}
