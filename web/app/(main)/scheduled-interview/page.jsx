"use client"
import { useUser } from "@/app/provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/services/supabaseClient";
import { ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InterviewCard from "../dashboard/_components/InterviewCard";
import WorkspaceEmptyState from "./_components/WorkspaceEmptyState";
import WorkspaceSummaryBar from "./_components/WorkspaceSummaryBar";
import WorkspaceToolbar from "./_components/WorkspaceToolbar";

const PAGE_SIZE = 6;

function ScheduledInterview() {
    const { user } = useUser();

    // Stats are aggregated over the FULL dataset (independent of pagination).
    const [statsList, setStatsList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter & sort state
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [sortBy, setSortBy] = useState("newest");

    // Paginated page state (cursor-based)
    const [pageItems, setPageItems] = useState([]);
    const [pageIndex, setPageIndex] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [pageLoading, setPageLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // cursorsRef.current[i] = cursor used to fetch page i (page 0 = null).
    const cursorsRef = useRef([null]);
    // nextCursor returned by the most recently fetched page.
    const nextCursorRef = useRef(null);
    // Guards against out-of-order responses clobbering newer state.
    const reqIdRef = useRef(0);

    // ---------- Debounced search (300ms) ----------
    useEffect(() => {
        const timer = setTimeout(() => setSearchQuery(searchInput), 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // ---------- Stats fetch (full dataset, once per user / refresh) ----------
    const fetchStats = useCallback(async () => {
        if (!user?.email) return;
        const { data } = await supabase
            .from("Interviews")
            .select("duration,interview_id,interview-feedback(userEmail)")
            .eq("userEmail", user.email);
        setStatsList(data || []);
    }, [user]);

    // ---------- Paginated fetch via cursor API ----------
    const fetchPage = useCallback(async (index) => {
        if (!user?.email) return;
        setPageLoading(true);
        const reqId = ++reqIdRef.current;
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;

            const cursor = cursorsRef.current[index] || null;
            const params = new URLSearchParams({ limit: String(PAGE_SIZE), sort: sortBy });
            if (searchQuery.trim()) params.set("search", searchQuery.trim());
            if (selectedTypes.length > 0) params.set("type", selectedTypes.join(","));
            if (cursor) {
                if (cursor.cursor_id != null) params.set("cursor_id", cursor.cursor_id);
                if (cursor.cursor_date != null) params.set("cursor_date", cursor.cursor_date);
                if (cursor.cursor_val != null) params.set("cursor_val", cursor.cursor_val);
            }

            const res = await fetch(`/api/interviews?${params.toString()}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const json = await res.json();

            // Ignore stale responses (a newer request has since fired).
            if (reqId !== reqIdRef.current) return;

            setPageItems(json.items || []);
            setHasMore(!!json.hasMore);
            setTotalCount(json.totalCount || 0);
            nextCursorRef.current = json.nextCursor || null;
            setPageIndex(index);
        } catch (err) {
            console.error("Failed to load interviews page:", err?.message || err);
            if (reqId === reqIdRef.current) {
                setPageItems([]);
                setHasMore(false);
            }
        } finally {
            if (reqId === reqIdRef.current) setPageLoading(false);
        }
    }, [user, sortBy, searchQuery, selectedTypes]);

    // Reset to page 1 and fetch whenever the dataset shape changes (search/filter/sort).
    const resetAndFetch = useCallback(() => {
        cursorsRef.current = [null];
        nextCursorRef.current = null;
        fetchPage(0);
    }, [fetchPage]);

    // Initial load (stats + first page).
    useEffect(() => {
        if (!user?.email) return;
        let active = true;
        (async () => {
            await Promise.all([fetchStats(), fetchPage(0)]);
            if (active) setLoading(false);
        })();
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Re-query (reset to page 1) when search/filter/sort change — after initial load.
    useEffect(() => {
        if (loading || !user?.email) return;
        resetAndFetch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, selectedTypes, sortBy]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([fetchStats(), (cursorsRef.current = [null], fetchPage(0))]).finally(() =>
            setRefreshing(false)
        );
    }, [fetchStats, fetchPage]);

    const goNext = useCallback(() => {
        if (!hasMore || pageLoading || !nextCursorRef.current) return;
        const ni = pageIndex + 1;
        cursorsRef.current[ni] = nextCursorRef.current;
        fetchPage(ni);
    }, [hasMore, pageLoading, pageIndex, fetchPage]);

    const goPrev = useCallback(() => {
        if (pageIndex <= 0 || pageLoading) return;
        fetchPage(pageIndex - 1);
    }, [pageIndex, pageLoading, fetchPage]);

    // Type filter toggle
    const handleTypeToggle = useCallback((typeName) => {
        setSelectedTypes((prev) =>
            prev.includes(typeName) ? prev.filter((t) => t !== typeName) : [...prev, typeName]
        );
    }, []);

    // Summary stats (computed from full unfiltered list)
    const stats = useMemo(() => {
        const list = statsList || [];
        const totalCandidates = list.reduce((sum, i) => sum + (i["interview-feedback"]?.length || 0), 0);
        const activeCount = list.filter((i) => (i["interview-feedback"]?.length || 0) > 0).length;
        const durations = list
            .map((i) => {
                const match = i.duration?.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            })
            .filter((d) => d > 0);
        const avgDuration =
            durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

        return { total: list.length, active: activeCount, candidates: totalCandidates, avgDuration };
    }, [statsList]);

    const hasFilters = searchQuery.trim() !== "" || selectedTypes.length > 0;

    const clearFilters = useCallback(() => {
        setSearchInput("");
        setSearchQuery("");
        setSelectedTypes([]);
    }, []);

    const clearSearch = useCallback(() => {
        setSearchInput("");
        setSearchQuery("");
    }, []);

    // Determine which empty state to show
    const getEmptyVariant = () => {
        if (statsList.length === 0) return "no-interviews";
        if (searchQuery.trim() && selectedTypes.length > 0) return "no-filter-match";
        if (searchQuery.trim()) return "no-results";
        return "no-filter-match";
    };

    // Pagination footer range
    const rangeStart = totalCount === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
    const rangeEnd = pageIndex * PAGE_SIZE + pageItems.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    // ---------- SKELETON LOADING ----------
    if (loading) {
        return (
            <div className="space-y-6">
                {/* Header skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-4 w-80 mt-2" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-9 w-40 rounded-md" />
                    </div>
                </div>
                {/* Stat cards skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3.5">
                            <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-5 w-12" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
                {/* Toolbar skeleton */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Skeleton className="h-10 flex-1 rounded-lg" />
                        <Skeleton className="h-10 w-44 rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-7 w-24 rounded-full" />
                        ))}
                    </div>
                </div>
                {/* Cards skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200/80 flex flex-col">
                            <div className="p-4 pb-0">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                            </div>
                            <div className="px-4 pt-3 pb-3 flex gap-1.5">
                                <Skeleton className="h-5 w-16 rounded-md" />
                                <Skeleton className="h-5 w-20 rounded-md" />
                                <Skeleton className="h-5 w-24 rounded-md" />
                            </div>
                            <div className="px-4 pb-4">
                                <Skeleton className="h-8 w-full rounded-md" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // ---------- MAIN RENDER ----------
    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="font-bold text-2xl text-slate-900">Interview Workspace</h1>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100">
                            {stats.total} interview{stats.total !== 1 ? "s" : ""}
                        </span>
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                        Review candidates, analyze interview insights, and make confident hiring decisions.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="h-9 w-9"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    </Button>
                    <Link href="/dashboard/create-interview">
                        <Button size="sm" className="h-9">
                            <Plus className="h-4 w-4 mr-1.5" />
                            Create Interview
                        </Button>
                    </Link>
                </div>
            </div>

            {/* ── Summary Stats ── */}
            <WorkspaceSummaryBar stats={stats} />

            {/* ── Toolbar (only show when interviews exist) ── */}
            {statsList.length > 0 && (
                <WorkspaceToolbar
                    searchInput={searchInput}
                    onSearchChange={setSearchInput}
                    selectedTypes={selectedTypes}
                    onTypeToggle={handleTypeToggle}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    resultCount={totalCount}
                    onClearFilters={clearFilters}
                    hasFilters={hasFilters}
                />
            )}

            {/* ── Interview Grid or Empty State ── */}
            {statsList.length === 0 ? (
                <WorkspaceEmptyState variant="no-interviews" />
            ) : totalCount > 0 ? (
                <>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 transition-opacity ${pageLoading ? "opacity-60" : "opacity-100"}`}>
                        {pageItems.map((interview, index) => (
                            <InterviewCard
                                key={interview.interview_id || index}
                                interview={interview}
                                viewDetail={true}
                            />
                        ))}
                    </div>

                    {/* ── Pagination footer ── */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <p className="text-sm text-slate-500 tabular-nums">
                            Showing <span className="font-semibold text-slate-700">{rangeStart}</span>
                            –<span className="font-semibold text-slate-700">{rangeEnd}</span> of{" "}
                            <span className="font-semibold text-slate-700">{totalCount}</span> interview{totalCount !== 1 ? "s" : ""}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 tabular-nums order-last sm:order-none">
                            Page {pageIndex + 1} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={goPrev}
                                disabled={pageIndex === 0 || pageLoading}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9"
                                onClick={goNext}
                                disabled={!hasMore || pageLoading}
                            >
                                {pageLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </>
            ) : (
                <WorkspaceEmptyState
                    variant={getEmptyVariant()}
                    onClearSearch={clearSearch}
                    onClearFilters={clearFilters}
                />
            )}
        </div>
    );
}

export default ScheduledInterview;
