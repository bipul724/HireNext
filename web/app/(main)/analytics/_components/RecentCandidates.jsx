import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Users, ChevronRight, ChevronLeft, Eye, Loader2 } from 'lucide-react'

import { supabase } from '@/services/supabaseClient'

function RecentCandidates({ totalCount, userEmail }) {
    const [candidates, setCandidates] = useState([])
    const [loading, setLoading] = useState(true)
    const [hasMore, setHasMore] = useState(false)
    const [cursorStack, setCursorStack] = useState([])
    const [currentCursor, setCurrentCursor] = useState(null)
    const [nextCursor, setNextCursor] = useState(null)
    const [error, setError] = useState(null)

    const fetchPage = useCallback(async (cursor, direction) => {
        if (!userEmail) return;
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            
            let url = `/api/analytics/candidates?limit=5`;
            if (cursor) {
                url += `&cursor_date=${encodeURIComponent(cursor.cursor_date)}&cursor_id=${encodeURIComponent(cursor.cursor_id)}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            const data = await response.json();

            if (response.ok) {
                setCandidates(data.items);
                setHasMore(data.hasMore);
                setNextCursor(data.nextCursor);
                
                if (direction === 'next') {
                    setCursorStack(prev => [...prev, currentCursor]);
                } else if (direction === 'prev') {
                    setCursorStack(prev => prev.slice(0, -1));
                } else if (direction === 'initial') {
                    setCursorStack([]);
                }
                
                setCurrentCursor(cursor);
            } else {
                setError(data.error);
            }
        } catch (err) {
            console.error("Failed to fetch candidates", err);
            setError("Failed to load candidates");
        } finally {
            setLoading(false);
        }
    }, [userEmail, currentCursor]);

    useEffect(() => {
        if (userEmail) {
            fetchPage(null, 'initial');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userEmail]);

    const handleNext = () => {
        if (hasMore && nextCursor) {
            fetchPage(nextCursor, 'next');
        }
    };

    const handlePrev = () => {
        if (cursorStack.length > 0) {
            const prevCursor = cursorStack[cursorStack.length - 1];
            fetchPage(prevCursor, 'prev');
        }
    };

    const calculateAvgRating = (candidateRow) => {
        const nestedFeedback = candidateRow?.feedback?.feedback ?? candidateRow?.feedback ?? candidateRow;
        const rating = nestedFeedback?.rating;
        if (!rating) return 0;
        const avg = (
            (rating.technicalSkills ?? rating.techicalSkills ?? 0) +
            (rating.communication ?? 0) +
            (rating.problemSolving ?? 0) +
            (rating.experience ?? rating.experince ?? 0)
        ) / 4;
        return avg.toFixed(1);
    }

    const GetRecommendationConfig = (candidateRow) => {
        const nestedFeedback = candidateRow?.feedback?.feedback ?? candidateRow?.feedback ?? candidateRow;
        const recommendationValue = nestedFeedback?.recommendation ?? nestedFeedback?.Recommendation ?? '';
        const rec = String(recommendationValue).toLowerCase();
        
        if (rec.includes("strong")) return { label: "Strong Hire", color: "text-emerald-600", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" };
        if (rec === "no" || rec === "false" || rec.includes("not") || rec.includes("no hire") || rec.includes("reject")) return { label: "No Hire", color: "text-rose-600", badge: "bg-rose-100 text-rose-800 border-rose-200" };
        if (rec.includes("maybe")) return { label: "Maybe", color: "text-amber-600", badge: "bg-amber-100 text-amber-800 border-amber-200" };
        if (rec === "true" || rec.includes("hire") || rec.includes("yes") || rec.includes("recommend")) return { label: "Hire", color: "text-teal-600", badge: "bg-teal-100 text-teal-800 border-teal-200" };
        return { label: "Pending", color: "text-slate-600", badge: "bg-slate-100 text-slate-800 border-slate-200" };
    }

    if (error) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 flex flex-col items-center justify-center text-center mt-6">
                <p className="text-rose-600 font-medium">{error}</p>
            </div>
        )
    }

    if (!loading && (!candidates || candidates.length === 0)) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 flex flex-col items-center justify-center text-center mt-6">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Users className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-semibold mb-1">No candidate data</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                    Candidates who complete interviews will appear here for review.
                </p>
            </div>
        )
    }

    const startIndex = cursorStack.length * 5 + 1;
    const currentRenderCount = candidates.length;
    const displayTotal = totalCount ? totalCount : (startIndex + currentRenderCount - 1);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm mt-6 flex flex-col h-full overflow-hidden relative">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-600" />
                    <h3 className="font-bold text-lg text-slate-900">All Candidate Reviews</h3>
                </div>
                <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {totalCount || 0} total
                </div>
            </div>
            
            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-sm text-left relative">
                    <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100 uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-lg tracking-wider">Candidate</th>
                            <th className="px-6 py-4 tracking-wider">Interview Role</th>
                            <th className="px-6 py-4 tracking-wider">Date</th>
                            <th className="px-6 py-4 tracking-wider">Score</th>
                            <th className="px-6 py-4 tracking-wider">Recommendation</th>
                            <th className="px-6 py-4 rounded-tr-lg tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className={loading ? "opacity-50" : "opacity-100 transition-opacity"}>
                        {candidates.map((candidate, index) => {
                            const recConfig = GetRecommendationConfig(candidate);
                            const score = calculateAvgRating(candidate);
                            
                            return (
                                <tr key={candidate.id || index} className="bg-white border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200">
                                                {candidate.userName?.[0]?.toUpperCase() || candidate.userEmail?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{candidate.userName || 'Unknown'}</p>
                                                <p className="text-xs text-slate-500">{candidate.userEmail || 'No email provided'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-slate-700 font-medium">{candidate.interview?.jobPosition || "General"}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {new Date(candidate.created_at).toLocaleDateString('en-US', {
                                            month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="inline-flex items-center justify-center bg-slate-100 text-slate-900 font-black px-3 py-1 rounded-lg border border-slate-200">
                                            {score}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${recConfig.badge}`}>
                                            {recConfig.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link 
                                            href={`/scheduled-interview/${candidate.mockIdRef}/candidate/${candidate.id}`}
                                            className="inline-flex items-center gap-2 text-sm font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 hover:text-teal-700 px-4 py-2 rounded-lg transition-colors border border-teal-100"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Review
                                        </Link>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px] z-10 min-h-[200px]">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                            <p className="text-sm text-slate-500 font-medium animate-pulse">Loading candidates...</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {(!loading || candidates.length > 0) && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <p className="text-sm text-slate-500 font-medium">
                        Showing {currentRenderCount > 0 ? startIndex : 0}-{currentRenderCount > 0 ? startIndex + currentRenderCount - 1 : 0} of {displayTotal} candidates
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrev}
                            disabled={cursorStack.length === 0 || loading}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                                cursorStack.length === 0 || loading 
                                ? 'text-slate-400 bg-slate-100 cursor-not-allowed' 
                                : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                            }`}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!hasMore || loading}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                                !hasMore || loading 
                                ? 'text-slate-400 bg-slate-100 cursor-not-allowed' 
                                : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
                            }`}
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default RecentCandidates
