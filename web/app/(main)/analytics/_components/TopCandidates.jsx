import React from 'react'
import Link from 'next/link'
import { Trophy, ChevronRight, User } from 'lucide-react'

function TopCandidates({ candidates }) {
    if (!candidates || candidates.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Trophy className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-semibold">No candidates yet</h3>
                <p className="text-sm text-slate-500 mt-1 text-center max-w-xs">
                    Complete some interviews to see your top performing candidates here.
                </p>
            </div>
        )
    }

    const GetRecommendationConfig = (recommendation) => {
        const rec = (recommendation || "").toLowerCase();
        if (rec.includes("strong")) return { label: "Strong Hire", color: "text-emerald-600", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" };
        if (rec.includes("not") || rec.includes("no hire")) return { label: "No Hire", color: "text-rose-600", badge: "bg-rose-100 text-rose-800 border-rose-200" };
        if (rec.includes("maybe")) return { label: "Maybe", color: "text-amber-600", badge: "bg-amber-100 text-amber-800 border-amber-200" };
        if (rec.includes("hire") || rec.includes("yes") || rec.includes("recommend")) return { label: "Hire", color: "text-teal-600", badge: "bg-teal-100 text-teal-800 border-teal-200" };
        return { label: "Pending", color: "text-slate-600", badge: "bg-slate-100 text-slate-800 border-slate-200" };
    };

    const medals = [
        "text-amber-400 bg-amber-50 border-amber-200", // Gold
        "text-slate-400 bg-slate-50 border-slate-200", // Silver
        "text-orange-400 bg-orange-50 border-orange-200" // Bronze
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-lg text-slate-900">Top Candidates</h3>
            </div>

            <div className="flex flex-col gap-4">
                {candidates.slice(0, 3).map((candidate, index) => {
                    const recConfig = GetRecommendationConfig(candidate.recommendation);
                    return (
                        <Link 
                            key={candidate.id} 
                            href={`/scheduled-interview/${candidate.interviewId}/candidate/${candidate.id}`}
                            className="group flex items-center justify-between p-5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all gap-4 overflow-hidden"
                        >
                            {/* Left: Rank & Avatar */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border font-bold text-sm ${medals[index] || "text-slate-400 bg-slate-50 border-slate-200"}`}>
                                    #{index + 1}
                                </div>
                                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold border border-teal-200 flex-shrink-0 hidden sm:flex">
                                    {candidate.userName?.[0]?.toUpperCase() || candidate.userEmail?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
                                </div>
                            </div>
                            
                            {/* Center: Name, Role, Badge */}
                            <div className="flex-grow min-w-0 pr-2 sm:pr-4">
                                <h4 className="font-bold text-slate-900 group-hover:text-teal-600 transition-colors truncate">
                                    {candidate.userName || "Unknown Candidate"}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${recConfig.badge} whitespace-nowrap`}>
                                        {recConfig.label}
                                    </span>
                                    <span className="text-xs text-slate-500 truncate hidden sm:block">
                                        {candidate.jobPosition}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Right: Score & Chevron */}
                            <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0 border-l border-slate-200 pl-4 sm:pl-6">
                                <div className="text-right">
                                    <div className="text-3xl font-black text-slate-900 tracking-tight">
                                        {candidate.score}
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-600 transition-colors flex-shrink-0" />
                            </div>
                        </Link>
                    )
                })}
            </div>
            
            {candidates.length > 3 && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500">
                        Showing top 3 out of {candidates.length} scored candidates
                    </p>
                </div>
            )}
        </div>
    )
}

export default TopCandidates
