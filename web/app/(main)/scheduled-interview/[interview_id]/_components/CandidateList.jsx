import moment from "moment";
import Link from "next/link";
import { ChevronRight, Clock, Award, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function CandidateList({ candidates, interviewId }) {
    if (!candidates || candidates.length === 0) return null;

    // Helper functions
    const GetAverageRating = (feedback) => {
        if (!feedback?.rating) return 0;
        const rating = feedback.rating;
        const total = (rating.technicalSkills ?? rating.techicalSkills ?? 0) + 
                      (rating.communication ?? 0) + 
                      (rating.problemSolving ?? 0) + 
                      (rating.experience ?? rating.experince ?? 0);
        return total / 4;
    }

    const GetRecommendationConfig = (recommendation) => {
        const rec = (recommendation || "").toLowerCase();
        if (rec.includes("strong")) return { label: "Strong Hire", color: "text-emerald-600", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", weight: 4 };
        if (rec.includes("not") || rec.includes("no hire")) return { label: "No Hire", color: "text-rose-600", badge: "bg-rose-100 text-rose-800 border-rose-200", weight: 1 };
        if (rec.includes("maybe")) return { label: "Maybe", color: "text-amber-600", badge: "bg-amber-100 text-amber-800 border-amber-200", weight: 2 };
        return { label: "Hire", color: "text-teal-600", badge: "bg-teal-100 text-teal-800 border-teal-200", weight: 3 };
    }

    // Process and sort candidates
    const processedCandidates = candidates.map(candidate => {
        const feedback = candidate?.feedback?.feedback ?? candidate?.feedback;
        const score = GetAverageRating(feedback);
        const recommendationValue = feedback?.recommendation || feedback?.Recommendation;
        const recConfig = GetRecommendationConfig(recommendationValue);
        const isGenerating = !candidate.feedback; // feedback JSONB is null

        return {
            ...candidate,
            score,
            recConfig,
            isGenerating,
            technical: feedback?.rating?.technicalSkills ?? feedback?.rating?.techicalSkills ?? 0,
            communication: feedback?.rating?.communication ?? 0
        };
    }).sort((a, b) => {
        if (a.isGenerating !== b.isGenerating) return a.isGenerating ? 1 : -1;
        if (a.recConfig.weight !== b.recConfig.weight) return b.recConfig.weight - a.recConfig.weight;
        return b.score - a.score;
    });

    return (
        <div className="pt-4">
            {/* Candidate Overview Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-teal-600" />
                        Candidates ({candidates.length})
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Review interview performance and hiring recommendations.
                    </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full inline-block">
                    Sorted by recommendation
                </span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {processedCandidates.map((candidate) => (
                    <Link 
                        key={candidate.id} 
                        href={`/scheduled-interview/${interviewId}/candidate/${candidate.id}`}
                        className="group block bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 hover:border-teal-400 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                    >
                        {/* Hover accent strip */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6">
                            
                            {/* Avatar & Info - LARGER FOR HIERARCHY */}
                            <div className="flex items-center gap-4 min-w-[280px]">
                                <div className="h-14 w-14 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xl shadow-sm">
                                    {candidate?.userName?.[0]?.toUpperCase() || candidate?.userEmail?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                                        {candidate?.userName || "Anonymous"}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-0.5">{candidate?.userEmail}</p>
                                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                                        <Clock className="h-3.5 w-3.5" />
                                        {moment(candidate?.created_at).fromNow()}
                                    </p>
                                </div>
                            </div>

                            {candidate.isGenerating ? (
                                <div className="flex-1 flex items-center gap-3 bg-amber-50/50 border border-amber-100/50 rounded-xl p-4">
                                    <div className="h-2.5 w-2.5 bg-amber-400 rounded-full animate-pulse" />
                                    <span className="text-sm font-medium text-amber-700">AI is analyzing feedback...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Score breakdown (Desktop) - MEDIUM VISUAL WEIGHT */}
                                    <div className="hidden lg:flex flex-1 items-center gap-10 px-6 border-l border-slate-100">
                                        <div className="flex flex-col gap-1.5 w-32">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                <span>Tech</span>
                                                <span className="text-slate-700">{candidate.technical}/10</span>
                                            </div>
                                            <Progress value={candidate.technical * 10} className="h-2 bg-slate-100" />
                                        </div>
                                        <div className="flex flex-col gap-1.5 w-32">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                                <span>Comm</span>
                                                <span className="text-slate-700">{candidate.communication}/10</span>
                                            </div>
                                            <Progress value={candidate.communication * 10} className="h-2 bg-slate-100" />
                                        </div>
                                    </div>

                                    {/* Recommendation & Overall Score - LARGEST VISUAL WEIGHT */}
                                    <div className="flex items-center justify-between md:justify-end gap-6 md:ml-auto w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                                        
                                        <span className={`inline-flex items-center justify-center px-4 py-1.5 text-sm font-bold rounded-full border ${candidate.recConfig.badge} shadow-sm`}>
                                            {candidate.recConfig.label}
                                        </span>

                                        <div className="text-right flex items-center gap-4">
                                            <div className="flex flex-col items-end justify-center">
                                                <div className="flex items-end gap-0.5">
                                                    <span className={`text-3xl font-bold leading-none ${candidate.recConfig.color}`}>
                                                        {candidate.score}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-400 mb-1">/10</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Overall</span>
                                            </div>
                                            
                                            <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-teal-50 transition-colors border border-slate-100 ml-2">
                                                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}

export default CandidateList;