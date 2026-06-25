import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/verify-user";
import { dlog } from "@/lib/debug/logger";

// End-to-end runtime tracer for the interview → feedback → analytics pipeline.
// REMOVABLE: delete this file + the AnalyticsDebugButton render to remove.
// Gated behind NEXT_PUBLIC_DEBUG_ANALYTICS=true. Changes no business logic.
//
// GET /api/debug/analytics                  → full diagnostics (no live AI call)
// GET /api/debug/analytics?probe=feedback   → also times a live generateFeedback() run

export const dynamic = "force-dynamic";

const ENV_KEYS = [
    "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "SUPABASE_SERVICE_ROLE_KEY",
    "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
    "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_VAPI_PUBLIC_KEY", "NEXT_PUBLIC_VAPI_SERVER_URL", "VAPI_WEBHOOK_SECRET",
    "NEXT_PUBLIC_WS_URL", "NEXT_PUBLIC_WS_SERVER_URL", "NEXT_PUBLIC_HOST_URL",
];

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

export async function GET(req) {
    if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS !== "true") {
        return NextResponse.json({ error: "Diagnostics disabled. Set NEXT_PUBLIC_DEBUG_ANALYTICS=true and restart." }, { status: 404 });
    }

    const origin = new URL(req.url).origin;
    const probe = new URL(req.url).searchParams.get("probe");
    const authHeader = req.headers.get("authorization") || "";

    const result = {
        environment: {}, database: {}, feedback: {}, analytics: {},
        timeline: [], dbValidation: {}, apiValidation: [], frontendValidation: {},
        healthScore: 100, criticalIssues: [], warnings: [], passedChecks: [],
        suggestedFixes: [], errors: [], recommendations: [],
    };

    // ── 1. ENVIRONMENT ──
    for (const k of ENV_KEYS) result.environment[k] = !!process.env[k];
    try { await import("@/lib/rate-limit"); result.environment._rateLimitImport = "ok"; }
    catch (e) { result.environment._rateLimitImport = "throws"; result.errors.push({ scope: "rate-limit-import", message: e?.message, stack: e?.stack }); }

    // ── AUTH ──
    const { email, supabase, error: authError } = await verifyUser(req);
    if (authError) {
        result.errors.push({ scope: "auth", message: authError.type });
        result.recommendations.push("Open from the logged-in Analytics page so the request carries your token.");
        return NextResponse.json(result, { status: 200 });
    }

    // ── 2/3. DATABASE: interviews (+joined feedback) and an independent feedback read ──
    let interviews = [];
    const tQuery0 = Date.now();
    try {
        const { data, error } = await supabase
            .from("Interviews")
            .select("interview_id,jobPosition,type,created_at,interview-feedback(*)")
            .eq("userEmail", email);
        if (error) throw error;
        interviews = data || [];
    } catch (e) { result.errors.push({ scope: "database.interviews", message: e?.message, stack: e?.stack }); }
    const analyticsQueryMs = Date.now() - tQuery0;

    let fbRows = [];
    try {
        const { data, error } = await supabase
            .from("interview-feedback")
            .select("id,interview_id,userEmail,feedback,processing_status,transcript,created_at")
            .eq("userEmail", email);
        if (error) throw error;
        fbRows = data || [];
    } catch (e) { result.errors.push({ scope: "database.feedback", message: e?.message, stack: e?.stack }); }

    const interviewIds = new Set(interviews.map((i) => i.interview_id));
    const allFeedback = [];
    interviews.forEach((i) => (i["interview-feedback"] || []).forEach((f) => allFeedback.push({ ...f, interview: { jobPosition: i.jobPosition, type: i.type } })));

    const statusCounts = {};
    let nullFeedback = 0;
    allFeedback.forEach((f) => { const st = f.processing_status ?? "(none)"; statusCounts[st] = (statusCounts[st] || 0) + 1; if (f.feedback == null) nullFeedback++; });

    result.database = {
        interviews: interviews.length,
        feedbackRows: allFeedback.length,
        feedbackRowsTotalForUser: fbRows.length,
        nullFeedback,
        feedbackPresent: allFeedback.length - nullFeedback,
        processingStatusCounts: statusCounts,
        analyticsQueryMs,
    };

    // ── 3b. FEEDBACK sample + one full row ──
    const firstScored = allFeedback.find((f) => f.feedback != null);
    result.feedback = {
        sample: allFeedback.slice(0, 5).map((f) => ({ id: f.id, processing_status: f.processing_status ?? null, feedbackIsNull: f.feedback == null, feedbackKeys: f.feedback ? Object.keys(f.feedback) : [], created_at: f.created_at })),
        oneFullRow: firstScored ? { id: firstScored.id, feedback: firstScored.feedback } : null,
    };

    // ── 4. ANALYTICS aggregation (exact Intelligence Center logic) ──
    let totalRating = 0, ratingCount = 0, recommendedCount = 0, strongHireCount = 0, maxScore = 0;
    const skillTotals = { technicalSkills: 0, communication: 0, problemSolving: 0, experience: 0 };
    const roleStats = {};
    allFeedback.forEach((fb) => {
        const nested = fb.feedback?.feedback ?? fb.feedback;
        const rating = nested?.rating;
        let score = 0;
        if (rating) {
            const tech = rating.technicalSkills ?? rating.techicalSkills ?? 0;
            const exp = rating.experience ?? rating.experince ?? 0;
            const avg = (tech + (rating.communication ?? 0) + (rating.problemSolving ?? 0) + exp) / 4;
            score = avg; totalRating += avg; ratingCount++; if (avg > maxScore) maxScore = avg;
            skillTotals.technicalSkills += tech; skillTotals.communication += rating.communication ?? 0;
            skillTotals.problemSolving += rating.problemSolving ?? 0; skillTotals.experience += exp;
        }
        const recRaw = (nested?.recommendation || nested?.Recommendation || "").toLowerCase();
        const isRec = (recRaw.includes("yes") || recRaw.includes("hire") || recRaw.includes("recommend") || recRaw.includes("maybe")) && !recRaw.includes("not") && !recRaw.includes("no hire");
        if (isRec) { recommendedCount++; if (recRaw.includes("strong")) strongHireCount++; }
        const role = fb.interview?.jobPosition || "General Role";
        roleStats[role] = roleStats[role] || { count: 0, totalScore: 0, recs: 0 };
        roleStats[role].count++; roleStats[role].totalScore += score; if (isRec) roleStats[role].recs++;
    });
    const totalCandidates = allFeedback.length;
    result.analytics = {
        totalCandidates, ratingCount, recommendedCount, strongHireCount,
        averageScore: ratingCount > 0 ? +(totalRating / ratingCount).toFixed(2) : 0,
        topScore: maxScore > 0 ? +maxScore.toFixed(2) : 0,
        hireRate: totalCandidates > 0 ? Math.round((recommendedCount / totalCandidates) * 100) : 0,
        skillTotals, roleStats,
    };

    // ── 5. DB VALIDATION ──
    const interviewsWithFeedback = new Set(allFeedback.map((f) => f.interview_id));
    const orphans = fbRows.filter((f) => f.interview_id && !interviewIds.has(f.interview_id)).map((f) => f.id);
    const dupMap = {};
    fbRows.forEach((f) => { const k = `${f.interview_id}|${f.userEmail}`; dupMap[k] = (dupMap[k] || 0) + 1; });
    const duplicates = Object.entries(dupMap).filter(([, n]) => n > 1).map(([k, n]) => ({ key: k, count: n }));
    let missingRating = 0, missingRecommendation = 0, malformedJson = 0;
    allFeedback.forEach((f) => {
        if (f.feedback == null) return;
        if (typeof f.feedback === "string") { malformedJson++; return; }
        const nested = f.feedback?.feedback ?? f.feedback;
        if (!isObj(nested?.rating)) missingRating++;
        if (!nested?.recommendation && !nested?.Recommendation) missingRecommendation++;
    });
    result.dbValidation = {
        orphanFeedbackRows: orphans,
        interviewsWithoutFeedback: interviews.length - interviewsWithFeedback.size,
        feedbackWithoutTranscript: fbRows.filter((f) => f.transcript == null).length,
        duplicateFeedback: duplicates,
        missingRating, missingRecommendation, malformedJson,
    };

    // ── 6. API VALIDATION (self-call the interviews endpoint) ──
    async function callApi(path) {
        const t0 = Date.now();
        try {
            const res = await fetch(`${origin}${path}`, { headers: authHeader ? { Authorization: authHeader } : {} });
            const ms = Date.now() - t0;
            let json = null; try { json = await res.json(); } catch { /* non-json */ }
            return { path, status: res.status, ms, ok: res.ok, schema: json && isObj(json) ? Object.keys(json) : [], itemsEmpty: Array.isArray(json?.items) ? json.items.length === 0 : null, totalCount: json?.totalCount ?? null, body: json };
        } catch (e) { return { path, status: 0, ms: Date.now() - t0, ok: false, error: e?.message }; }
    }
    // Audit the REAL analytics data sources the page depends on (kpis = the
    // production source of truth, computed by the get_analytics_kpis RPC).
    const kpisCall = await callApi("/api/analytics/kpis");
    const candCall = await callApi("/api/analytics/candidates");
    const interviewsCall = await callApi("/api/interviews?limit=1&sort=newest");
    result.apiValidation = [kpisCall, candCall, interviewsCall].map(({ body, ...rest }) => rest);

    // What the Intelligence Center actually renders (source of truth).
    result.productionAnalytics = kpisCall.ok ? kpisCall.body : { error: `kpis ${kpisCall.status}`, detail: kpisCall.body || kpisCall.error };

    // Divergence check: production RPC vs this route's independent JS recompute.
    const prod = kpisCall.body || {};
    result.analyticsDivergence = kpisCall.ok ? {
        totalInterviews: { production: prod.totalInterviews ?? null, diagnostics: interviews.length },
        totalCandidates: { production: prod.totalCandidates ?? null, diagnostics: totalCandidates },
        avgRating: { production: prod.avgRating ?? null, diagnostics: result.analytics.averageScore },
        topScore: { production: prod.topScore ?? null, diagnostics: result.analytics.topScore },
        hireRate: { production: prod.hireRate ?? null, diagnostics: result.analytics.hireRate },
        note: "production = get_analytics_kpis RPC (what the page shows). diagnostics = independent JS recompute (cross-check only; may differ).",
    } : { note: "Production KPI endpoint failed — see apiValidation; the page would show no data regardless of the DB." };

    // Label the route's own aggregation as a secondary cross-check, not the page's path.
    result.analytics._source = "diagnostics JS recompute (NOT the production path; production = get_analytics_kpis RPC via /api/analytics/kpis)";

    // ── 7. AI FEEDBACK pipeline preflight + optional live probe ──
    const pipeline = { steps: {} };
    pipeline.steps.envOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
    pipeline.steps.envOpenRouterModel = !!process.env.OPENROUTER_MODEL;
    try { const { getOpenRouterClient } = await import("@/lib/ai/openrouter"); getOpenRouterClient(); pipeline.steps.clientInit = "ok"; }
    catch (e) { pipeline.steps.clientInit = "throws"; result.errors.push({ scope: "openrouter-client", message: e?.message }); }

    let probeResult = null;
    if (probe === "feedback") {
        const t0 = Date.now();
        try {
            const { generateFeedback } = await import("@/lib/feedback/generate-feedback");
            const out = await generateFeedback({ conversation: [{ role: "user", content: "Diagnostics probe transcript." }], codeSubmission: "", codeLanguage: "" });
            probeResult = { step: "completed", ms: Date.now() - t0, feedbackKeys: out?.feedback ? Object.keys(out.feedback) : [] };
        } catch (e) {
            // Classify the failing pipeline step from the error.
            let step = "openrouter-request";
            const m = e?.message || "";
            if (/OPENROUTER_MODEL/i.test(m)) step = "env-model";
            else if (/OPENROUTER_API_KEY/i.test(m)) step = "env-key";
            else if (/No JSON found|JSON/i.test(m)) step = "json-parse";
            probeResult = { step: "failed", failedAt: step, ms: Date.now() - t0, message: m, stack: e?.stack };
            result.errors.push({ scope: "feedback-probe", step, message: m, stack: e?.stack });
        }
    }
    pipeline.probe = probeResult;
    result.feedback.pipeline = pipeline;

    // ── 8. TIMELINE (per-stage status reconstructed from measured evidence) ──
    const fbAttempted = allFeedback.length > 0;
    const fbSaved = result.database.feedbackPresent > 0;
    const stage = (step, status, extra = {}) => ({ step, status, ...extra });
    const genStatus = probeResult ? (probeResult.step === "completed" ? "success" : "failed") : (fbSaved ? "success" : fbAttempted ? "failed" : "no-data");
    result.timeline = [
        stage("Interview Created", interviews.length > 0 ? "success" : "no-data", { count: interviews.length }),
        stage("Interview Started / Vapi Connected", "unmeasured", { note: "Client-side voice event; not observable server-side." }),
        stage("Transcript Saved", result.dbValidation.feedbackWithoutTranscript < fbRows.length || fbAttempted ? (fbRows.some((f) => f.transcript) || fbAttempted ? "success" : "no-data") : "no-data"),
        stage("GenerateFeedback Called", genStatus),
        stage("OpenRouter Request", probeResult ? (probeResult.failedAt === "openrouter-request" ? "failed" : probeResult.step === "completed" ? "success" : "skipped") : genStatus, probeResult?.message && probeResult.failedAt === "openrouter-request" ? { error: probeResult.message } : {}),
        stage("OpenRouter Response", probeResult ? (probeResult.step === "completed" ? "success" : "failed") : genStatus, probeResult?.ms ? { duration: probeResult.ms } : {}),
        stage("JSON Parsed", probeResult ? (probeResult.failedAt === "json-parse" ? "failed" : probeResult.step === "completed" ? "success" : "skipped") : (fbSaved ? "success" : "failed"), probeResult?.failedAt === "json-parse" ? { error: probeResult.message } : {}),
        stage("Feedback Saved", fbSaved ? "success" : fbAttempted ? "failed" : "no-data", { nullFeedback }),
        stage("Analytics Query", interviews.length >= 0 ? "success" : "failed", { duration: analyticsQueryMs }),
        stage("Dashboard Render", ratingCount > 0 ? "success" : "empty", { renders: ratingCount > 0 ? "real values" : "zeros (no scored feedback)" }),
    ];

    // ── 9. FRONTEND TRACE (raw → state → rendered; where it collapses) ──
    let collapsePoint;
    if (allFeedback.length === 0) collapsePoint = "No feedback rows exist for this user → all widgets empty by definition.";
    else if (ratingCount === 0) collapsePoint = "PARSE step: DB returns feedback rows, but stored `feedback` has no `.rating` (null/unscored) → analytics state computes 0 → cards render 0.";
    else collapsePoint = "Data flows end-to-end; values are non-zero.";
    result.frontendValidation = {
        raw: { feedbackRowsFromDb: allFeedback.length },
        state: { ratingCount, recommendedCount, totalCandidates },
        rendered: { totalCandidates, averageScore: result.analytics.averageScore, topScore: result.analytics.topScore, hireRate: result.analytics.hireRate, recommended: recommendedCount },
        collapsePoint,
    };

    // ── 10. HEALTH SCORE + structured fixes ──
    let score = 100;
    const critical = [], warn = [], passed = [], fixes = [];
    const deduct = (n, bucket, msg, fix) => { score -= n; bucket.push(msg); if (fix) fixes.push(fix); };

    if (!result.environment.OPENROUTER_MODEL) deduct(20, critical, "OPENROUTER_MODEL missing", { severity: "critical", file: "lib/feedback/generate-feedback.js", line: 13, rootCause: "generateFeedback throws when OPENROUTER_MODEL is undefined.", fix: "Set OPENROUTER_MODEL in the runtime env (e.g. nvidia/nemotron-3-super-120b-a12b:free) and restart." });
    else passed.push("OPENROUTER_MODEL present");
    if (!result.environment.SUPABASE_SERVICE_ROLE_KEY) deduct(20, critical, "SUPABASE_SERVICE_ROLE_KEY missing", { severity: "critical", file: "app/api/ai-feedback/route.jsx", line: 8, rootCause: "Route throws before generating feedback when the service key is missing.", fix: "Set SUPABASE_SERVICE_ROLE_KEY in the runtime env." });
    else passed.push("SUPABASE_SERVICE_ROLE_KEY present");
    if (!result.environment.UPSTASH_REDIS_REST_URL || !result.environment.UPSTASH_REDIS_REST_TOKEN) deduct(15, critical, "UPSTASH_REDIS_REST_URL/TOKEN missing", { severity: "critical", file: "lib/rate-limit.js", line: 18, rootCause: "Redis.fromEnv() throws at module import, crashing /api/ai-feedback before generation.", fix: "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the runtime env." });
    else passed.push("UPSTASH credentials present");
    if (result.environment._rateLimitImport === "throws") deduct(15, critical, "lib/rate-limit fails to import in this runtime", { severity: "critical", file: "app/api/ai-feedback/route.jsx", line: 4, rootCause: "Importing aiRateLimit evaluates Redis.fromEnv(), which throws → POST returns 500 before feedback is generated.", fix: "Provide UPSTASH creds (above)." });
    else passed.push("rate-limit module imports cleanly");
    if (result.database.feedbackRows > 0 && nullFeedback === result.database.feedbackRows) deduct(15, critical, "Every feedback row has NULL feedback (generation never persisted)", { severity: "critical", file: "app/api/ai-feedback/route.jsx", line: 43, rootCause: "Feedback generation failed/never ran, so the feedback column was never written.", fix: "Fix the env issues above, then regenerate feedback for affected interviews." });
    if (ratingCount === 0 && result.database.feedbackRows > 0) deduct(10, warn, "ratingCount=0 despite feedbackRows>0", { severity: "warning", file: "app/(main)/analytics/page.jsx", line: 98, rootCause: "Stored feedback lacks `.rating` (null/unscored), so aggregation yields 0.", fix: "Ensure feedback generation succeeds and persists the rating JSON." });
    if (duplicates.length > 0) deduct(10, warn, `${duplicates.length} duplicate feedback group(s)`, { severity: "warning", file: "migrations/2026_add_feedback_processing_state.sql", line: 0, rootCause: "Missing/duplicated UNIQUE(interview_id, userEmail).", fix: "Apply the UNIQUE constraint migration." });
    if (orphans.length > 0) deduct(10, warn, `${orphans.length} orphan feedback row(s)`, { severity: "warning", file: "—", line: 0, rootCause: "Feedback rows reference an interview_id not present in Interviews.", fix: "Investigate/clean orphan rows; verify interview_id correlation." });
    if (malformedJson > 0) deduct(10, warn, `${malformedJson} malformed feedback JSON row(s)`, { severity: "warning", file: "lib/ai/parse-ai-response.js", line: 1, rootCause: "feedback column stored as string / non-object.", fix: "Confirm parseAiResponse output is stored as JSON, not a string." });
    if (!kpisCall.ok) deduct(25, critical, `Production analytics endpoint /api/analytics/kpis returned ${kpisCall.status}`, { severity: "critical", file: "app/api/analytics/kpis/route.js", line: 14, rootCause: kpisCall.body?.error || kpisCall.error || "get_analytics_kpis RPC failed (missing DB function / RPC error). This is the page's actual data source.", fix: "Verify the get_analytics_kpis Postgres function exists and the RPC succeeds; check server logs for the RPC error." });
    else passed.push("/api/analytics/kpis responds 200");
    if (!candCall.ok) deduct(10, warn, `/api/analytics/candidates returned ${candCall.status}`, { severity: "warning", file: "app/api/analytics/candidates/route.js", line: 0, rootCause: candCall.body?.error || candCall.error || "Candidates analytics endpoint failed.", fix: "Check the route + RPC/query and server logs." });
    else passed.push("/api/analytics/candidates responds 200");
    const divergent = kpisCall.ok && ((prod.totalCandidates ?? null) !== totalCandidates || (prod.avgRating ?? null) !== result.analytics.averageScore);
    if (divergent) deduct(5, warn, "Production KPIs differ from the diagnostics recompute", { severity: "warning", file: "app/api/debug/analytics/route.js", line: 0, rootCause: "The diagnostics JS aggregation is a copy and can drift from the get_analytics_kpis RPC.", fix: "Trust productionAnalytics (kpis) for what the page shows; treat result.analytics as a cross-check only." });
    if (!interviewsCall.ok) deduct(5, warn, `/api/interviews returned ${interviewsCall.status}`, { severity: "warning", file: "app/api/interviews/route.jsx", line: 50, rootCause: interviewsCall.error || "Non-2xx from the interviews endpoint.", fix: "Check auth/token and server logs for this route." });
    if (interviews.length > 0 && result.database.feedbackRows === 0) deduct(5, warn, "Interviews exist but no feedback rows", { severity: "warning", file: "app/interview/[interview_id]/start/page.jsx", line: 0, rootCause: "Candidates haven't completed interviews, or GenerateFeedback never inserted rows.", fix: "Complete an interview end-to-end and confirm the feedback row is created." });

    result.healthScore = Math.max(0, score);
    result.criticalIssues = critical;
    result.warnings = warn;
    result.passedChecks = passed;
    result.suggestedFixes = fixes;

    dlog("Analytics", "diagnostics", { healthScore: result.healthScore, critical: critical.length, warnings: warn.length });
    return NextResponse.json(result, { status: 200 });
}
