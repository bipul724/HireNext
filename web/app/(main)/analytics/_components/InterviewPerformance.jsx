import React from 'react'
import { BarChart3, Star, Users } from 'lucide-react'

function InterviewPerformance({ performanceData }) {
    if (!performanceData || performanceData.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <BarChart3 className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-semibold">No performance data</h3>
                <p className="text-sm text-slate-500 mt-1 text-center">
                    Create multiple interviews to track performance comparisons.
                </p>
            </div>
        )
    }

    // Sort by highest average score
    const sortedData = [...performanceData].sort((a, b) => b.avgScore - a.avgScore);
    const topRole = sortedData[0];
    const topRoles = sortedData.slice(0, 5);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-amber-500" />
                    <h3 className="font-bold text-lg text-slate-900">Interview Performance</h3>
                </div>
            </div>

            {/* Performance Callout */}
            {topRole && topRole.avgScore > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Star className="h-16 w-16 text-amber-600" />
                    </div>
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Best Performing Role</p>
                    <h4 className="text-lg font-bold text-slate-900 mb-3">{topRole.role}</h4>
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-xs text-slate-500 font-medium mb-0.5">Average Score</p>
                            <p className="text-xl font-black text-amber-700">{topRole.avgScore.toFixed(1)} <span className="text-sm font-medium text-amber-600/60">/ 10</span></p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-medium mb-0.5">Recommendation Rate</p>
                            <p className="text-xl font-black text-slate-700">{topRole.recRate}%</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 flex-grow overflow-y-auto pr-2">
                {topRoles.map((data, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                        <div>
                            <h5 className="font-semibold text-slate-900 text-sm mb-1">{data.role}</h5>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" /> {data.candidateCount} candidates
                                </span>
                                <span>•</span>
                                <span>{data.recRate}% Rec. Rate</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-lg text-sm border border-slate-200">
                                {data.avgScore.toFixed(1)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {sortedData.length > 5 && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                        Showing top 5 of {sortedData.length} roles
                    </p>
                </div>
            )}
        </div>
    )
}

export default InterviewPerformance
