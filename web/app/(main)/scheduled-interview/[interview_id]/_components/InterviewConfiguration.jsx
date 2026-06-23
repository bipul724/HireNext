import { FileText, HelpCircle, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useState } from "react";

function InterviewConfiguration({interviewDetail}){
    const [isExpanded, setIsExpanded] = useState(false);

    if (!interviewDetail) return null;

    return(
        <div className="bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div 
                className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-200/50 rounded-md text-slate-500">
                        <Settings className="h-4 w-4" />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-700">Interview Configuration</h2>
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full ml-2">
                        Read-only
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    {isExpanded ? (
                        <>Hide <ChevronUp className="h-4 w-4" /></>
                    ) : (
                        <>View Details <ChevronDown className="h-4 w-4" /></>
                    )}
                </div>
            </div>

            {/* Collapsible Content */}
            {isExpanded && (
                <div className="border-t border-slate-200/80 p-6 grid grid-cols-1 lg:grid-cols-2 gap-10 bg-white">
                    {/* Job Description */}
                    <div>
                        <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                            <FileText className="h-4 w-4 text-slate-400" />
                            Job Description
                        </h3>
                        <div className="prose prose-sm prose-slate max-w-none text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-5 border border-slate-100 whitespace-pre-wrap">
                            {interviewDetail.jobDescription}
                        </div>
                    </div>

                    {/* AI Questions */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <HelpCircle className="h-4 w-4 text-slate-400" />
                                AI Questions
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full">
                                {interviewDetail.questionList?.length || 0} Total
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            {interviewDetail.questionList?.map((q, idx) => (
                                <div key={idx} className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex gap-3 hover:border-slate-200 transition-colors">
                                    <div className="flex-shrink-0 mt-0.5">
                                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-500 shadow-sm">
                                            Q{idx + 1}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                        {q.question}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default InterviewConfiguration;
