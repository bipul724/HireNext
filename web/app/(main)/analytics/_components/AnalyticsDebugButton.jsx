"use client";

// REMOVABLE diagnostics UI. Renders only when NEXT_PUBLIC_DEBUG_ANALYTICS=true.
import { useState } from "react";
import { supabase } from "@/services/supabaseClient";
import { Bug, X, Loader2, RefreshCw, FlaskConical } from "lucide-react";

const SectionPre = ({ title, value }) => (
    <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">{title}</p>
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words text-slate-700">
            {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        </pre>
    </div>
);

export default function AnalyticsDebugButton() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);

    const run = async (withProbe = false) => {
        setLoading(true);
        setErr(null);
        try {
            const { data: s } = await supabase.auth.getSession();
            const token = s?.session?.access_token;
            const res = await fetch(`/api/debug/analytics${withProbe ? "?probe=feedback" : ""}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const json = await res.json();
            setData(json);
        } catch (e) {
            setErr(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => { setOpen(true); if (!data) run(false); }}
                className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold shadow-lg hover:bg-slate-800 transition-colors"
                title="Analytics diagnostics"
            >
                <Bug className="h-4 w-4" />
                Debug
            </button>

            {open && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
                    <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Bug className="h-4 w-4 text-slate-600" />
                                <h2 className="font-semibold text-slate-800">Analytics Diagnostics</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => run(false)} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100">
                                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Reload
                                </button>
                                <button onClick={() => run(true)} disabled={loading} className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 px-2 py-1 rounded-md hover:bg-amber-50" title="Runs a live generateFeedback() dry-run (uses an OpenRouter token)">
                                    <FlaskConical className="h-3.5 w-3.5" /> Live probe
                                </button>
                                <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-slate-100">
                                    <X className="h-4 w-4 text-slate-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 overflow-y-auto">
                            {loading && !data && (
                                <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Collecting runtime evidence…
                                </div>
                            )}
                            {err && <SectionPre title="Request error" value={err} />}
                            {data && (
                                <>
                                    {typeof data.healthScore === "number" && (
                                        <div className="mb-4 flex items-center gap-3">
                                            <div className={`text-3xl font-black tabular-nums ${data.healthScore >= 80 ? "text-emerald-600" : data.healthScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                                                {data.healthScore}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                Health Score
                                                <div className="text-[11px] text-slate-400">
                                                    {(data.criticalIssues?.length || 0)} critical · {(data.warnings?.length || 0)} warnings · {(data.passedChecks?.length || 0)} passed
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {Array.isArray(data.suggestedFixes) && data.suggestedFixes.length > 0 && (
                                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-1.5">Suggested Fixes</p>
                                            <ul className="space-y-2 text-xs text-amber-900">
                                                {data.suggestedFixes.map((f, i) => (
                                                    <li key={i}>
                                                        <span className={`inline-block px-1.5 rounded text-[10px] font-bold uppercase mr-1.5 ${f.severity === "critical" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"}`}>{f.severity}</span>
                                                        <span className="font-semibold">{f.rootCause}</span>
                                                        <div className="text-[11px] text-amber-800/80 mt-0.5">{f.file}{f.line ? `:${f.line}` : ""} — {f.fix}</div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {Array.isArray(data.timeline) && data.timeline.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Pipeline Timeline</p>
                                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                {data.timeline.map((t, i) => {
                                                    const c = t.status === "success" ? "text-emerald-600" : t.status === "failed" ? "text-red-600" : t.status === "empty" || t.status === "no-data" ? "text-amber-600" : "text-slate-400";
                                                    return (
                                                        <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs border-b border-slate-100 last:border-0">
                                                            <span className="text-slate-700">{t.step}</span>
                                                            <span className={`font-semibold ${c}`}>
                                                                {t.status}{typeof t.duration === "number" ? ` · ${t.duration}ms` : ""}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {data.productionAnalytics && (
                                        <SectionPre title="Production analytics (/api/analytics/kpis — what the page shows)" value={data.productionAnalytics} />
                                    )}
                                    {data.analyticsDivergence && (
                                        <SectionPre title="Production vs diagnostics (divergence check)" value={data.analyticsDivergence} />
                                    )}
                                    <SectionPre title="Frontend trace (raw → state → rendered)" value={data.frontendValidation} />
                                    <SectionPre title="Environment" value={data.environment} />
                                    <SectionPre title="Database" value={data.database} />
                                    <SectionPre title="DB Validation" value={data.dbValidation} />
                                    <SectionPre title="API Validation" value={data.apiValidation} />
                                    <SectionPre title="Analytics (intermediates)" value={data.analytics} />
                                    <SectionPre title="Feedback" value={data.feedback} />
                                    {Array.isArray(data.errors) && data.errors.length > 0 && (
                                        <SectionPre title="Errors" value={data.errors} />
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
