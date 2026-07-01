# Analytics Page Performance Audit

**Scope:** `/analytics` (Intelligence Center), HireNext `web/` app.
**Method:** Direct source inspection of every file in the request path. No profiler/APM data was available, so all latency numbers below are *estimates derived from operation shape* (query size, round-trip count, payload size), not measured wall-clock time. Anywhere I could not confirm something from code (e.g. DB indexes), I say so explicitly.

**Correction to the brief first:** this codebase does not use Prisma/Postgres directly. Data access goes through the `@supabase/supabase-js` client (PostgREST + Supabase Auth over HTTP), not a Prisma client. I audited the equivalent Supabase query patterns instead of Prisma — the underlying issues (N+1, missing selects, sequential round trips, missing indexes) map 1:1 onto the same questions you asked, so the audit below still answers all of them.

---

## 1. Architecture Diagram — Request Flow

```
Browser (GET /analytics)
  ↓
Next.js Router → app/(main)/analytics/page.jsx   ["use client" — entire page, no server component]
  ↓ (mount, hydrate, then useEffect fires)
supabase.auth.getSession()              [client-side, reads local session]
  ↓
fetch('/api/analytics/kpis')            [Route Handler, sequential #1]
  ↓
verifyUser(req) → supabase.auth.getUser(token)   [network round trip to Supabase Auth]
  ↓
supabase.from("Interviews").select("...,interview-feedback(*)").eq("userEmail", email)
  ↓  [PostgREST → Postgres, single joined query, UNBOUNDED — no .limit()]
Postgres (Interviews ⋈ interview-feedback)
  ↓
route.js: JS-side reduce over every feedback row (rating math, role grouping, skill totals)
  ↓
JSON.stringify → NextResponse.json(...)
  ↓ (response received, THEN, sequentially — not parallel)
fetch('/api/analytics/candidates?limit=20')   [Route Handler, sequential #2]
  ↓
verifyUser(req) → supabase.auth.getUser(token)   [2nd network round trip to Supabase Auth]
  ↓
supabase.from("interview-feedback").select("*, interview:Interviews!inner(jobPosition,type,userEmail)")
  ↓
Postgres (interview-feedback ⋈ Interviews, inner join, filtered + ordered + limited)
  ↓
JSON.stringify → NextResponse.json(...)
  ↓
setLoading(false) → page renders
  ↓ (separately, RecentCandidates.jsx mounts as a child and fires its OWN effect)
fetch('/api/analytics/candidates?limit=5')    [Route Handler, sequential #3 — DUPLICATE of #2]
  ↓
verifyUser(req) → supabase.auth.getUser(token)   [3rd network round trip to Supabase Auth]
  ↓
Postgres (same table, same join, smaller page)
```

There is no service/repository layer — the route handlers in `app/api/analytics/kpis/route.js` and `app/api/analytics/candidates/route.js` contain the query, the aggregation, and the response shaping all inline.

---

## 2. End-to-End Latency Timeline

```
Browser
│
├── HTML + JS bundle              (page.jsx is "use client" → full client bundle must
│                                   download + hydrate before any data fetch starts;
│                                   no server-rendered HTML, no streaming, no loading.tsx)
│
├── Hydration → useEffect([user]) fires only once useUser() context resolves
│
├── supabase.auth.getSession()    local, cheap (~1-5ms), but still an awaited async hop
│
├── Request 1: GET /api/analytics/kpis          ◄── BLOCKS everything after it
│      Auth:        supabase.auth.getUser(token)         [network round trip]
│      Query:       Interviews ⋈ interview-feedback(*)   [unbounded, full user history]
│      Aggregation: O(n) reduce over ALL feedback rows, in Node, per request
│      Serialize:   JSON.stringify of rolePerformance + skillsPerformance + raw counts
│
├── Request 2: GET /api/analytics/candidates?limit=20    ◄── starts only AFTER Request 1 resolves
│      Auth:        supabase.auth.getUser(token)         [2nd network round trip]
│      Query:       interview-feedback ⋈ Interviews (inner), select *, order x2, limit 21
│      Serialize:   full feedback JSON (including transcript field) x20 rows
│
├── setLoading(false) → main page renders
│
└── Request 3 (child component, RecentCandidates): GET /api/analytics/candidates?limit=5
       Auth:        supabase.auth.getUser(token)         [3rd network round trip]
       Query:       same shape as Request 2, redundant
```

**What dominates:** the two sequential auth-gated network round trips (Request 1 → Request 2, strictly serial) plus the unbounded aggregation query in Request 1. Request 3 doesn't block first paint but doubles the candidates work and adds a third auth round trip on every page load. Nothing here is cached, memoized, or deduplicated — every visit to `/analytics` repeats the full sequence from zero, including for a user who was just on the page 10 seconds ago.

---

## 3. Database / Query Performance Report

### Query A — `app/api/analytics/kpis/route.js`, lines 16-19

```js
const { data: interviews } = await supabase
    .from("Interviews")
    .select("interview_id,jobPosition,type,created_at,interview-feedback(*)")
    .eq("userEmail", email);
```

- **Why it's slow:** No `.limit()`. This fetches *every interview the user has ever created*, plus the full `interview-feedback(*)` row for each — including the `feedback` JSON blob and (per the debug route's own select list at `app/api/debug/analytics/route.js:70`) a `transcript` column that can be large. There is no pagination and no field pruning; `select("*")`-equivalent on the joined table pulls columns the KPI aggregation never touches (transcript text, raw processing metadata).
- **Complexity:** O(n) rows returned, O(n) work in Postgres for the join, O(n) work again in JS (`allFeedback.forEach` at line 39) to aggregate ratings, skills, and role stats. This is a full scan of the user's entire history on every single page load — there is no incremental/precomputed aggregate.
- **Estimated cost:** Negligible at ~10-50 interviews. At 1,000+ interviews for a single recruiter, this becomes a multi-hundred-KB response with real join + serialization + JS-reduce cost. It will scale linearly with account age/activity, and will get slower for your power users specifically — not a fixed cost.
- **Suggested rewrite:** Move the aggregation into Postgres (a Supabase RPC / SQL function, or a materialized view refreshed on feedback insert) that returns pre-aggregated `{avgRating, topScore, hireRate, rolePerformance, skillsPerformance}` directly, instead of shipping every row to Node and reducing it there. This is exactly what the stale comment in `app/api/debug/analytics/route.js:165-167` claims already happens ("computed by the get_analytics_kpis RPC") — **it does not**; the live route does the JS reduce. That comment is out of date / describes an unshipped design, not the current code. I cannot prove whether an RPC of that name exists in the DB at all — the current route never calls one.
- **Expected improvement:** Pushing aggregation into SQL with an index-backed `GROUP BY` would turn an O(n) row-transfer + Node reduce into a single scalar/row response. For a user with hundreds of interviews this is plausibly a >70% reduction in this query's contribution to the response.

### Query B — `app/api/analytics/candidates/route.js`, lines 15-21

```js
let query = supabase
    .from("interview-feedback")
    .select("*, interview:Interviews!inner(jobPosition, type, userEmail)")
    .eq("interview.userEmail", email)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
```

- **Why it's slow:** `select("*, ...)` on `interview-feedback` pulls the full `feedback` JSON and `transcript` for every row, even though the UI (`RecentCandidates.jsx`, `TopCandidates.jsx`) only reads `userName`, `userEmail`, `feedback.feedback.rating.*`, `feedback.feedback.recommendation`, `created_at`, and `mockIdRef`/`interview_id`. Filtering on `interview.userEmail` through an `!inner` join means Postgres must join before it can filter — this only performs well if `Interviews.userEmail` and `interview-feedback.interview_id` are indexed.
- **Complexity:** Correctly paginated (cursor-based, `limit(limit+1)` for a has-more check — this part is well done), but the two `.order()` calls (`created_at` then `id`) need a composite index on `(created_at DESC, id DESC)` to avoid a sort. **I cannot prove from the code whether that index exists** — there are no migration/schema files in the repo to check (no `.sql` files found). This needs to be verified directly in the Supabase dashboard.
- **Estimated cost:** Fine at low volume; the double-order-by without a matching composite index degrades to a sort on every request as row count grows.
- **Suggested rewrite:** Explicit `select()` field list instead of `*`:
  ```js
  .select("id, created_at, userName, userEmail, feedback, mockIdRef, interview:Interviews!inner(jobPosition, type, userEmail)")
  ```
  (drop `transcript` and any other unused columns), plus confirm/create a composite index on `interview-feedback(created_at, id)` and `Interviews(userEmail)`.
- **Expected improvement:** Trimming `transcript` out of the select is the single biggest payload win in the whole page — transcripts are free-text conversation logs and are plausibly the largest field on the row by an order of magnitude.

### N+1 assessment

There is no classic N+1 (no per-row follow-up query) — both queries use a single joined `select`. The problem here is the opposite failure mode you also asked about: **one query doing too much work** (Query A, full unbounded history) and **duplicate whole-query round trips** (Query B, fetched twice — see React section).

### Indexes

No SQL/migration files exist in the repo (`find . -iname "*.sql"` returned nothing), so I cannot confirm or deny index presence from the codebase. This is a real gap: **I cannot prove this from the available code.** Recommend checking, directly in Supabase: an index on `Interviews(userEmail)`, an index on `interview-feedback(interview_id)`, and a composite `interview-feedback(created_at, id)` for the cursor pagination in Query B.

---

## 4. React Performance Report

**File:** `app/(main)/analytics/page.jsx`

- **Entire page is a Client Component** (`"use client"` at line 1). There is no server-rendered shell — the browser gets an essentially empty HTML document, has to download and hydrate the full JS bundle, then *start* fetching data. Nothing is server-rendered or streamed.
- **Sequential, not parallel, fetches** (lines 51 and 136): the candidates fetch is nested inside the `try` block *after* `await response.json()` for KPIs completes. These two requests have no data dependency on each other and should run concurrently with `Promise.all`.
- **Duplicate fetch, duplicate auth, duplicate state:** `page.jsx` fetches `/api/analytics/candidates?limit=20` (line 136) to derive `topCandidatesData` and `activityData`. `RecentCandidates.jsx` (lines 16-59), rendered as a child on the same page, independently calls `supabase.auth.getSession()` and fetches `/api/analytics/candidates?limit=5` again — same table, same filter, same auth round trip, wastefully re-run instead of being derived from data the parent already has. This is the single clearest "one more API route than necessary" issue in the whole page.
- **`useEffect` gating:** `useEffect(() => { if (user) fetchAnalyticsData() }, [user])` (page.jsx:39) is correct in intent but means the entire fetch waits on `useUser()` resolving from its own context/effect chain — worth confirming that context doesn't itself add a serial hop (not fully traced here since it's outside `/analytics`).
- **No memoization / no unnecessary rerenders found:** `StatCard`, `TopCandidates`, `SkillsBreakdownChart` are plain, cheap render functions with no obvious rerender storm — I did not find evidence of wasted rerenders here. Derived-data computation (`skillsArray`, `generatedInsights`, sorting/scoring candidates) happens once per fetch inside the async handler, not on every render, so it isn't a render-cost problem.
- **No SWR / React Query anywhere in the app** (`package.json` has neither dependency). All data fetching is raw `fetch` + `useState` + `useEffect`, hand-rolled. That means: no request deduplication, no caching between mounts, no stale-while-revalidate, no automatic retry/backoff, no shared cache between `page.jsx` and `RecentCandidates.jsx` even though they request overlapping data. This is why the duplicate-fetch problem above exists at all — a request cache keyed on the URL would have prevented it for free.

---

## 5. Next.js Performance Report

- **Server Components:** none in the Analytics path. `page.jsx` and every `_components/*.jsx` file that touches data are `"use client"`.
- **Route Handlers:** `app/api/analytics/kpis/route.js` and `.../candidates/route.js` have no `export const revalidate`, no `cache()`, no `dynamic` export — they default to fully dynamic, per-request execution with zero caching. `app/api/debug/analytics/route.js` explicitly sets `dynamic = "force-dynamic"`; the two real analytics routes don't need to, because they're already effectively dynamic by default (they read the auth header on every call).
- **fetch():** the client-side `fetch()` calls in `page.jsx`/`RecentCandidates.jsx` use no caching options (no `next: { revalidate }`), which is expected/correct since this is client-side `fetch`, not the Next.js server `fetch` — but it also means there is zero HTTP caching layer anywhere in this path.
- **Suspense / streaming / loading.tsx:** none present for the analytics route segment. There is no `app/(main)/analytics/loading.jsx`, so the only loading state is the manual `if (loading) return <spinner>` inside the client component — meaning the browser shows a blank page, then a spinner, then content, all client-driven.
- **Is the page accidentally fully dynamic?** Yes — but not "accidentally" in the sense of a Next.js caching footgun; it's dynamic because it's 100% client-rendered with no server data-fetching primitives (`fetch` with `revalidate`, `cache()`, or a Server Component) in play at all. There's nothing for Next.js's static/ISR machinery to cache here because the page never asks it to.

---

## 6. Network Audit / Request Timeline

```
t=0ms      GET /analytics (HTML shell, client-rendered)
t=+Xms     JS bundle downloaded + hydrated
t=+Xms     supabase.auth.getSession() (local)
t=+Xms     GET /api/analytics/kpis           ──┐ auth round trip + unbounded query + JS aggregation
t=+X+Yms   (response received)                 ┘
t=+X+Yms   GET /api/analytics/candidates?limit=20  ──┐ auth round trip + join query, oversized select(*)
t=+X+Y+Zms (response received)                        ┘
t=+X+Y+Zms page renders, loading=false
t=+X+Y+Zms   GET /api/analytics/candidates?limit=5  ──┐ DUPLICATE: same table, another auth round trip
t=+X+Y+Z+Wms (response received)                       ┘  RecentCandidates finishes its own loading state
```

- **Waterfall:** confirmed — request 2 is strictly sequential after request 1 (`page.jsx`), and request 3 is a fully independent duplicate fired by a child component after mount.
- **Duplicate fetch:** confirmed — `/api/analytics/candidates` is called twice per page load with overlapping data (`limit=20` then `limit=5`, same filter/order), each paying its own auth round trip.
- **Repeated authentication:** confirmed — 3 separate `supabase.auth.getUser(token)` calls per page load, one per API request, each a network hop to Supabase Auth. None of the three route handlers share a cached verification result.
- **Oversized payloads:** `interview-feedback.*` includes `transcript` and the full nested `feedback` JSON in both candidates requests; only a handful of scalar fields are actually rendered.
- **Unnecessary requests:** the `limit=5` request from `RecentCandidates.jsx` is avoidable outright — its data is a strict subset of what `page.jsx` already fetched with `limit=20`.

---

## 7. Production Readiness

| Users | Verdict | Bottleneck |
|---|---|---|
| 100 | OK | Latency dominated by the 3 sequential/duplicate round trips (auth + waterfall), not by data volume. Annoying but survivable. |
| 1,000 | Degraded | If any subset of these users have large interview histories, the unbounded KPI query (Query A) starts contributing real, user-specific latency — some users' Analytics pages will be visibly slower than others', not uniformly slow. |
| 10,000 | At risk | Every page load still does a full, uncached recompute of the KPI aggregation with no server-side cache. This is a compute-per-request cost that scales with total request volume with no relief from caching, CDN, or ISR — DB load scales linearly with page views, not with data changes. |
| 100,000 | Not ready as built | No caching layer exists anywhere between the browser and Postgres for this page. Every single page view re-runs the full join + aggregation + 3 auth calls. This will produce real DB and Supabase Auth load proportional to traffic, with no mitigation in the current code. |

I want to be direct about the ceiling here: this isn't a "your queries are inefficient" problem so much as a "there is no caching tier at all" problem. Even a perfectly-indexed, perfectly-selected query set will not survive 100k users hitting an endpoint that recomputes from scratch on every request with zero cache-hit path.

---

## 8. Top 10 Bottlenecks, Ranked by Impact

```
1. HIGH ★★★★★
   No caching layer anywhere (route handlers, RPC/materialized view, HTTP cache).
   Every page view triggers a full DB recompute. This is the root cause behind
   #2-#5 mattering at scale.
   File: app/api/analytics/kpis/route.js (whole file)

2. HIGH ★★★★★
   /api/analytics/candidates is fetched twice per page load with overlapping
   data (page.jsx:136 and RecentCandidates.jsx:29), each paying a full auth
   round trip + query.
   Fix: derive RecentCandidates' first page from the parent's already-fetched
   data, or share via a single cache (React Query/SWR) instead of independent
   fetches.
   Estimated improvement: removes 1 of 3 network round trips + 1 of 3 auth
   calls from the critical path entirely.

3. HIGH ★★★★☆
   KPI query has no .limit() and joins full interview-feedback(*) including
   large text fields (transcript), then aggregates in JS per request.
   File: app/api/analytics/kpis/route.js:16-19
   Fix: precompute via SQL aggregate/RPC or materialized view.
   Estimated improvement: scales the query from O(user's total history) to
   O(1) response construction; biggest win for high-activity accounts.

4. HIGH ★★★★☆
   page.jsx fetches KPIs then candidates sequentially instead of in parallel
   (page.jsx:48-140) — no data dependency between them.
   Fix: Promise.all([fetchKpis(), fetchCandidates()]).
   Estimated improvement: removes one full round trip's worth of serial
   latency from time-to-content.

5. MEDIUM ★★★★☆
   Both candidates queries select("*", ...) including transcript and full
   nested feedback JSON, when only a few scalar fields are rendered.
   File: app/api/analytics/candidates/route.js:17
   Fix: explicit column list, drop transcript.
   Estimated improvement: payload size reduction proportional to average
   transcript length × row count — plausibly the largest single field on
   the wire.

6. MEDIUM ★★★☆☆
   3 separate Supabase Auth round trips per page load (one per API call),
   none shared/cached.
   Files: lib/auth/verify-user.js, called from both route.js files
   Fix: consolidate the two/three data calls behind one route (see #9) so
   auth is verified once per page load, not once per query.

7. MEDIUM ★★★☆☆
   No index evidence in repo for interview-feedback(created_at, id) composite
   ordering used in candidates pagination, or Interviews(userEmail).
   I cannot prove this from the available code — needs direct DB verification.
   Fix: confirm/add indexes in Supabase.

8. LOW-MEDIUM ★★★☆☆
   Entire Analytics page is a Client Component with no Server Component,
   Suspense, or loading.jsx — browser gets a blank shell until JS hydrates
   and the first fetch completes.
   File: app/(main)/analytics/page.jsx:1
   Fix: move static shell/layout to a Server Component, stream data-dependent
   widgets with Suspense boundaries.

9. LOW ★★☆☆☆
   Two analytics API routes (kpis, candidates) plus a redundant third call
   could reasonably be merged into one route that returns everything the
   page needs in a single response, cutting round trips further.
   Fix: a single /api/analytics route returning {kpis, recentCandidates}.

10. LOW ★★☆☆☆
    No SWR/React Query anywhere in the app — every navigation back to
    /analytics repeats the entire fetch sequence from zero, even if the user
    was just there seconds ago.
    Fix: adopt SWR/React Query for automatic caching + dedup; would have
    prevented bottleneck #2 for free.
```

---

## 9. Concrete Code Changes

**Fix #2 + #4 (parallelize, stop duplicate fetch)** — `app/(main)/analytics/page.jsx`

Before (sequential, and candidates re-fetched again in a child):
```js
const response = await fetch('/api/analytics/kpis', { headers: ... })
const data = await response.json()
// ...state updates...
const candRes = await fetch('/api/analytics/candidates?limit=20', { headers: ... })
```

After:
```js
const [kpiRes, candRes] = await Promise.all([
    fetch('/api/analytics/kpis', { headers }),
    fetch('/api/analytics/candidates?limit=20', { headers }),
])
```
Then pass the already-fetched `items` down as a prop to `RecentCandidates` for its first page, so it only needs to fetch when the user paginates past what the parent already has — instead of re-fetching page 1 unconditionally on mount.

**Fix #5 (trim payload)** — `app/api/analytics/candidates/route.js:17`
```js
// Before
.select("*, interview:Interviews!inner(jobPosition, type, userEmail)")

// After
.select("id, created_at, userName, userEmail, feedback, mockIdRef, interview:Interviews!inner(jobPosition, type, userEmail)")
```

**Fix #3 (move aggregation into SQL)** — replace the JS reduce in `app/api/analytics/kpis/route.js` with a call to a Postgres function/RPC that returns pre-aggregated KPIs, e.g. `supabase.rpc('get_analytics_kpis', { p_user_email: email })`, and have that function do the `GROUP BY`/aggregate work in SQL instead of shipping every row to Node.

---

## 10. Estimated Load Time & Score

**Before (estimated, low-activity account, network-bound not DB-bound at this scale):**
Blank shell → JS hydrate → 3 sequential-ish network calls with 3 auth round trips ≈ noticeably staggered content, worse for high-activity users where Query A's unbounded scan adds real time on top.

**After the fixes above:**
Parallelized 2 calls instead of 3 sequential+duplicate ones, 1 auth round trip fewer, smaller payloads, SQL-side aggregation removing the O(n) JS reduce — plausibly a meaningful reduction in time-to-content for active accounts, and removes the "gets slower as the user's history grows" scaling problem entirely. I'm not going to hand you a fabricated millisecond number for "before/after" since I have no APM/profiler trace to measure against — the honest claim is *directional*, not quantified: fewer round trips, smaller payloads, O(1) instead of O(n) aggregation.

**Overall score: 42/100**

Justification: the pagination logic in the candidates route (cursor-based, correct `hasMore` handling) is genuinely well done, and the individual queries aren't pathologically written — no true N+1, no obvious anti-pattern like a query-per-row loop. But the page loses points for: zero caching anywhere in the stack (server or client), a fully client-rendered page with no streaming/Suspense, a duplicate fetch that pays its own auth round trip for data the parent already has, an unbounded aggregation query with no SQL-side rollup, and no SWR/React Query to paper over any of it. This is a page that works fine today because usage is low, and will degrade specifically as a function of (a) individual users' interview history size and (b) total traffic, with nothing in the code currently positioned to absorb either.
