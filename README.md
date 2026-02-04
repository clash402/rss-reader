## Current – Personal RSS Reader

Current is a calm, local-first RSS/Atom reader built with the Next.js App Router. The MVP keeps everything on-device, emphasizes a distraction-free interface, and lays the groundwork for future sync/auth layers.

### Tech stack

- **Next.js 16 + React 19 + TypeScript** for the UI and server routes.
- **Tailwind CSS 4** with custom tokens plus lightweight shadcn-style primitives.
- **IndexedDB via `idb`** for feeds, articles, tags, and metadata.
- **Server utilities**: `rss-parser` for feeds, `jsdom` + `Readability` for reader extraction, and `sanitize-html` for safe rendering.
- **UX polish**: `react-swipeable` gestures, `sonner` toasts, subtle motion, and responsive layouts.

---

## Getting started

```bash
npm install
npm run dev
# optional quality checks
npm run lint
npm run build
```

Visit http://localhost:3000 to use the app. Desktop shows a two-pane layout (feeds + articles/reader). Mobile collapses into a drill-in stack with tabs for All, Saved, and Tags.

Data lives entirely in the browser’s IndexedDB; clearing site data resets the experience.

---

## Architecture overview

| Layer                                                              | Purpose                                                                                                                                             |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Storage** (`src/lib/storage.ts`)                                 | Typed IndexedDB stores plus helpers for CRUD, search, and metadata.                                                                                 |
| **Reader store** (`src/lib/reader-store.tsx`)                      | React context that seeds demo data, exposes feed/article state, orchestrates refreshes, reader extraction, and gesture-friendly loading flags.      |
| **Server routes** (`src/app/api`)                                  | `/api/feeds` normalizes RSS/Atom + caching headers, `/api/feeds/discover` finds feeds from any URL, `/api/reader` extracts clean article text/HTML. |
| **UI shell** (`src/components/shell/home-shell.tsx`)               | Responsive layout with search, tagging, swipe/keyboard shortcuts, skeletons, empty states, and toast feedback.                                      |
| **Design primitives** (`src/components/ui`, `src/app/globals.css`) | Accent palette, typography, and reusable buttons/panels/inputs.                                                                                     |

---

## Adding auth + sync later

1. **Authentication**: Introduce [NextAuth.js](https://next-auth.js.org/) (App Router `auth.ts`) for sign-in. Email links + OAuth are simple to bolt on.
2. **Database**: Mirror the IndexedDB schema in Postgres (e.g., Supabase). Store feeds/articles/tags per user with columns for etag/lastModified and sync cursors.
3. **Sync flow**: Keep IndexedDB as an offline cache. When a session exists, use Supabase Edge Functions (or Next.js route handlers) to pull/push changes, reconciling by feed/article IDs. Emit toasts when sync conflicts occur.
4. **Future enhancements**: background refresh via Web Push or cron jobs, plus sharing/export once server storage is in place.

---

## Known limitations & next steps

- Local-only data (no auth/sync) — see the plan above for upgrading.
- No OPML import/export yet (explicitly out of scope for MVP+).
- Reader extraction can fail on heavily scripted pages; we fall back to snippets with a CTA to open the original article.
- Accessibility still needs a full audit (landmarks, high-contrast mode, focus order) even though base shortcuts/ARIA labels exist.
- Automated tests are not in place; add React Testing Library + integration tests after the core flows settle.

---

## Scripts & tooling

| Command                           | Description                                          |
| --------------------------------- | ---------------------------------------------------- |
| `npm run dev`                     | Start the development server.                        |
| `npm run build` / `npm run start` | Production build & serve.                            |
| `npm run lint`                    | Generate types + run ESLint with `--max-warnings=0`. |
| `npm run format`                  | Prettier across the repo.                            |

Enjoy the calm reading experience, and feel free to open an issue/PR when you start exploring sync or new features.
