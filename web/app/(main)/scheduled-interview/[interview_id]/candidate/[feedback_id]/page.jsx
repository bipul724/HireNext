"use client"

import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/app/provider";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/services/supabaseClient";
import { ArrowLeft, Clock, Code, FileText, CheckCircle2, AlertCircle, Maximize2, Search, ChevronDown, ChevronUp, Copy, Check, Award } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import moment from "moment";
import { Editor } from "@monaco-editor/react";

export default function CandidateReviewPage() {
    const { interview_id, feedback_id } = useParams();
    const router = useRouter();
    const { user } = useUser();
    
    const [candidate, setCandidate] = useState(null);
    const [interview, setInterview] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [transcriptExpanded, setTranscriptExpanded] = useState(false);
    const [transcriptSearch, setTranscriptSearch] = useState("");
    const [codeCopied, setCodeCopied] = useState(false);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, interview_id, feedback_id]);

    const fetchData = async () => {
        try {
            // Fetch Feedback
            const { data: feedbackData } = await supabase
                .from("interview-feedback")
                .select("*")
                .eq("id", feedback_id)
                .single();
            
            // Fetch Interview Details
            const { data: interviewData } = await supabase
                .from("Interviews")
                .select("jobPosition, type, duration")
                .eq("interview_id", interview_id)
                .single();

            setCandidate(feedbackData);
            setInterview(interviewData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (candidate?.code_submission) {
            navigator.clipboard.writeText(candidate.code_submission);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    // Derived State
    const feedback = candidate?.feedback?.feedback ?? candidate?.feedback;
    const scores = useMemo(() => {
        if (!feedback?.rating) return { technical: 0, communication: 0, problemSolving: 0, experience: 0, overall: 0 };
        const { 
            technicalSkills, techicalSkills, 
            communication = 0, 
            problemSolving = 0, 
            experience, experince 
        } = feedback.rating;
        
        const finalTech = technicalSkills ?? techicalSkills ?? 0;
        const finalExp = experience ?? experince ?? 0;
        
        return {
            technical: finalTech,
            communication: communication,
            problemSolving: problemSolving,
            experience: finalExp,
            overall: (finalTech + communication + problemSolving + finalExp) / 4
        };
    }, [feedback]);

    const recConfig = useMemo(() => {
        const recommendationValue = feedback?.recommendation ?? feedback?.Recommendation ?? "";
        const rec = String(recommendationValue).toLowerCase();
        if (rec.includes("strong")) return { label: "Strong Hire", badge: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" };
        if (rec === "no" || rec === "false" || rec.includes("not") || rec.includes("no hire") || rec.includes("reject")) return { label: "No Hire", badge: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" };
        if (rec.includes("maybe")) return { label: "Maybe", badge: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" };
        if (rec === "true" || rec.includes("hire") || rec.includes("yes") || rec.includes("recommend")) return { label: "Hire", badge: "bg-teal-500", text: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" };
        return { label: "Pending", badge: "bg-slate-500", text: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" };
    }, [feedback]);

    const isGenerating = !feedback;

    if (loading) {
        return (
            <div className="space-y-6 max-w-6xl mx-auto pb-12">
                <Skeleton className="h-4 w-64" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                    <div className="lg:col-span-8 space-y-6">
                        <Skeleton className="h-64 w-full rounded-2xl" />
                        <Skeleton className="h-96 w-full rounded-2xl" />
                    </div>
                    <div className="lg:col-span-4 space-y-6">
                        <Skeleton className="h-80 w-full rounded-2xl" />
                        <Skeleton className="h-48 w-full rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!candidate) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
                <h2 className="text-xl font-semibold text-slate-700">Candidate Not Found</h2>
                <button onClick={() => router.back()} className="mt-4 text-teal-600 hover:underline">Go back</button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pb-12">
            {/* Breadcrumb & Navigation */}
            <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-6">
                <Link href="/scheduled-interview" className="hover:text-teal-600 transition-colors">Workspace</Link>
                <span>/</span>
                <Link href={`/scheduled-interview/${interview_id}/details`} className="hover:text-teal-600 transition-colors truncate max-w-[200px]">
                    {interview?.jobPosition || "Interview Details"}
                </Link>
                <span>/</span>
                <span className="text-slate-700 font-medium truncate">{candidate.userName || "Candidate"}</span>
            </div>

            <button 
                onClick={() => router.back()} 
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Candidates
            </button>

            {/* Candidate Header */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                        {candidate?.userName?.[0]?.toUpperCase() || candidate?.userEmail?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{candidate.userName || "Anonymous Candidate"}</h1>
                        <p className="text-sm text-slate-500 mt-1">{candidate.userEmail}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-400">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {moment(candidate.created_at).format("MMM D, YYYY • h:mm A")}</span>
                            {interview?.type && <span className="flex items-center gap-1"><Code className="h-3 w-3" /> {interview.type}</span>}
                        </div>
                    </div>
                </div>
                
                {!isGenerating && (
                    <div className="flex items-center gap-6 md:pl-6 md:border-l border-slate-100">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Overall Score</p>
                            <p className="text-3xl font-bold text-slate-900 leading-none">{scores.overall}<span className="text-lg text-slate-400">/10</span></p>
                        </div>
                        <div className={`px-4 py-2 rounded-xl border ${recConfig.bg} ${recConfig.border}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5" style={{ color: recConfig.text.replace('text-', '') }}>Recommendation</p>
                            <p className={`font-bold text-lg leading-none ${recConfig.text}`}>{recConfig.label}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Content Area */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {isGenerating ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                            <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                                <Clock className="h-6 w-6 animate-pulse" />
                            </div>
                            <h3 className="text-lg font-bold text-amber-900">AI is Analyzing the Interview</h3>
                            <p className="text-amber-700 mt-2 max-w-md">We are currently processing the candidate's responses and code submissions. This usually takes 30-60 seconds.</p>
                        </div>
                    ) : (
                        <>
                            {/* Hiring Decision Card */}
                            <div className={`rounded-2xl border p-6 ${recConfig.bg} ${recConfig.border}`}>
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-full bg-white shadow-sm shrink-0`}>
                                        {recConfig.label.includes("Not") ? <AlertCircle className={`h-6 w-6 ${recConfig.text}`} /> : <CheckCircle2 className={`h-6 w-6 ${recConfig.text}`} />}
                                    </div>
                                    <div>
                                        <h2 className={`text-xl font-bold ${recConfig.text}`}>{recConfig.label}</h2>
                                        <p className={`text-sm mt-2 leading-relaxed opacity-90 ${recConfig.text}`}>
                                            {feedback?.recommendationMsg || feedback?.RecommendationMsg || feedback?.summary || feedback?.summery || "No detailed recommendation provided."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Summary */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                                    <FileText className="h-5 w-5 text-slate-400" />
                                    Performance Summary
                                </h3>
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {feedback?.summary || feedback?.summery || "No summary available."}
                                </p>
                            </div>

                            {/* Code Submission Review */}
                            {interview?.type === "Technical" && (
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            <Code className="h-5 w-5 text-slate-400" />
                                            Code Submission
                                        </h3>
                                        <div className="flex items-center gap-3">
                                            {candidate.code_language && (
                                                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-200 text-slate-700">
                                                    {candidate.code_language.toUpperCase()}
                                                </span>
                                            )}
                                            <button 
                                                onClick={handleCopyCode}
                                                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500 transition-colors"
                                                title="Copy code"
                                            >
                                                {codeCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-0 border-t border-slate-100">
                                        {candidate.code_submission ? (
                                            <div className="h-[400px]">
                                                <Editor
                                                    height="100%"
                                                    language={candidate.code_language?.toLowerCase() || "javascript"}
                                                    theme="vs-light"
                                                    value={candidate.code_submission}
                                                    options={{
                                                        readOnly: true,
                                                        minimap: { enabled: false },
                                                        scrollBeyondLastLine: false,
                                                        fontSize: 14,
                                                        padding: { top: 16, bottom: 16 }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-sm text-slate-500">
                                                No code was submitted during this interview.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Transcript Section */}
                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setTranscriptExpanded(!transcriptExpanded)}>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-slate-400" />
                                        Interview Transcript
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-400 font-medium">Not available in current schema</span>
                                        {transcriptExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                    </div>
                                </div>
                                {transcriptExpanded && (
                                    <div className="p-8 text-center bg-slate-50/50">
                                        <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">Transcript recording is not currently available for this interview.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {!isGenerating && (
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sticky top-6">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                                <Award className="h-4 w-4 text-teal-600" />
                                Performance Scoreboard
                            </h3>
                            
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-semibold text-slate-700">Technical Skills</span>
                                        <span className="font-bold text-slate-900">{scores.technical}/10</span>
                                    </div>
                                    <Progress value={scores.technical * 10} className="h-2" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-semibold text-slate-700">Communication</span>
                                        <span className="font-bold text-slate-900">{scores.communication}/10</span>
                                    </div>
                                    <Progress value={scores.communication * 10} className="h-2" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-semibold text-slate-700">Problem Solving</span>
                                        <span className="font-bold text-slate-900">{scores.problemSolving}/10</span>
                                    </div>
                                    <Progress value={scores.problemSolving * 10} className="h-2" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-semibold text-slate-700">Experience</span>
                                        <span className="font-bold text-slate-900">{scores.experience}/10</span>
                                    </div>
                                    <Progress value={scores.experience * 10} className="h-2" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
