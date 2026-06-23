import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";

// Cursor-based (keyset) pagination for the Scheduled Interviews workspace.
//
// The cursor is COMPOUND: a primary sort value + interview_id tiebreak, so rows
// that share a primary value (e.g. identical created_at) are never duplicated or
// skipped across pages. The keyset predicate generalizes the spec's example
//   created_at < cursorDate OR (created_at = cursorDate AND id < cursorId)   (DESC)
// to every supported sort:
//   newest       → created_at  DESC, interview_id DESC
//   oldest       → created_at  ASC,  interview_id ASC
//   alphabetical → jobPosition ASC,  interview_id ASC
//   candidates   → feedback count DESC, interview_id DESC
//
// Note: search + type filtering and the candidates-count ordering are applied in
// this route (PostgREST cannot keyset on a related-row aggregate without a DB
// function/view, which is out of scope). Filtering/sorting/cursoring all operate
// on the same dataset, so pagination is correct for every search/filter/sort combo.

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 50;

const feedbackCount = (row) => row?.["interview-feedback"]?.length || 0;

// dir: 1 = ascending, -1 = descending. kind drives value comparison.
const SORTS = {
  newest:       { dir: -1, kind: "date", val: (r) => r.created_at || "" },
  oldest:       { dir:  1, kind: "date", val: (r) => r.created_at || "" },
  alphabetical: { dir:  1, kind: "str",  val: (r) => (r.jobPosition || "").toLowerCase() },
  candidates:   { dir: -1, kind: "num",  val: (r) => feedbackCount(r) },
};

const cmp = (a, b) => (a === b ? 0 : a < b ? -1 : 1);

export async function GET(req) {
  try {
    const sp = new URL(req.url).searchParams;

    const limit = Math.min(Math.max(parseInt(sp.get("limit"), 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const search = (sp.get("search") || "").trim().toLowerCase();
    const typeParam = (sp.get("type") || "").trim();
    const types = typeParam ? typeParam.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : [];
    const sortKey = SORTS[sp.get("sort")] ? sp.get("sort") : "newest";
    const cursorId = sp.get("cursor_id");
    const cursorDate = sp.get("cursor_date");
    const cursorVal = sp.get("cursor_val");

    // --- Auth: scope strictly to the caller's own interviews (RLS via token) ---
    const { user, email, supabase, error: authError } = await verifyUser(req);
    if (authError?.type === "missing_token") return NextResponse.json({ error: "Missing token" }, { status: 401 });
    if (authError?.type === "invalid_token") return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { data: rows, error } = await supabase
      .from("Interviews")
      .select("jobPosition,duration,interview_id,created_at,type,interview-feedback(userEmail)")
      .eq("userEmail", email);
    if (error) throw error;

    // 1) Filter (search by title/ID, type by substring) — same dataset for all steps.
    let filtered = (rows || []).filter((r) => {
      if (search) {
        const inTitle = (r.jobPosition || "").toLowerCase().includes(search);
        const inId = (r.interview_id || "").toLowerCase().includes(search);
        if (!inTitle && !inId) return false;
      }
      if (types.length > 0) {
        const t = (r.type || "").toLowerCase();
        if (!types.some((x) => t.includes(x))) return false;
      }
      return true;
    });

    const totalCount = filtered.length;

    // 2) Sort: primary value, then interview_id tiebreak — both in the sort direction.
    const s = SORTS[sortKey];
    filtered.sort((a, b) => {
      const pc = cmp(s.val(a), s.val(b));
      if (pc !== 0) return pc * s.dir;
      return cmp(a.interview_id || "", b.interview_id || "") * s.dir;
    });

    // 3) Compound-cursor keyset: keep only rows strictly AFTER the cursor row.
    let windowed = filtered;
    if (cursorId != null) {
      const cPrimary = s.kind === "num" ? Number(cursorVal) : s.kind === "date" ? (cursorDate || "") : (cursorVal || "").toLowerCase();
      windowed = filtered.filter((r) => {
        const pc = cmp(s.val(r), cPrimary) * s.dir; // >0 means r sorts after cursor on primary
        if (pc > 0) return true;
        if (pc < 0) return false;
        return cmp(r.interview_id || "", cursorId) * s.dir > 0; // tiebreak on id
      });
    }

    const hasMore = windowed.length > limit;
    const items = windowed.slice(0, limit);

    let nextCursor = null;
    if (items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = {
        cursor_id: last.interview_id,
        cursor_date: last.created_at,
        cursor_val: String(s.val(last)),
      };
    }

    return NextResponse.json({ items, hasMore, nextCursor, totalCount }, { status: 200 });
  } catch (err) {
    console.error("[/api/interviews] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to fetch interviews" }, { status: 500 });
  }
}
