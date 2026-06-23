"use client"

import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/app/provider";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/services/supabaseClient";
import InterviewConfiguration from "../_components/InterviewConfiguration";
import CandidateList from "../_components/CandidateList";
import CandidateAnalyticsBar from "../_components/CandidateAnalyticsBar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Clock, Code, Calendar, Users } from "lucide-react";
import Link from "next/link";
import moment from "moment";

function InterviewDetail(){
    const {interview_id} = useParams();
    const router = useRouter();
    const {user} = useUser();
    const [interviewDetail, setInterviewDetail] = useState();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        user && GetInterviewDetail();
    }, [user]);

    const GetInterviewDetail = async () => {
        const { data, error } = await supabase.from("Interviews")
                    .select(`jobPosition,jobDescription,type,questionList,duration,interview_id,created_at,
                        interview-feedback(id,userEmail,userName,feedback,created_at,code_submission,code_language)`)
                    .eq("userEmail", user?.email)
                    .eq("interview_id", interview_id);

        setInterviewDetail(data?.[0]);
        setLoading(false);
    }

    const typeColors = {
        'Technical': 'bg-sky-50 text-sky-700 border-sky-200',
        'Behavioral': 'bg-violet-50 text-violet-700 border-violet-200',
        'Experience': 'bg-amber-50 text-amber-700 border-amber-200',
        'Problem Solving': 'bg-emerald-50 text-emerald-700 border-emerald-200',
        'Leadership': 'bg-rose-50 text-rose-700 border-rose-200',
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-7xl mx-auto pb-12">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-10 w-96 mt-4" />
                <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-md" />
                    <Skeleton className="h-6 w-28 rounded-md" />
                    <Skeleton className="h-6 w-32 rounded-md" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                </div>
                <Skeleton className="h-8 w-48 mt-8" />
                <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    const candidates = interviewDetail?.['interview-feedback'] || [];
    
    return(
        <div className="max-w-7xl mx-auto pb-12 space-y-8">
            
            {/* Header Section */}
            <div>
                {/* Breadcrumb & Navigation */}
                <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-4">
                    <Link href="/scheduled-interview" className="hover:text-teal-600 transition-colors">
                        Workspace
                    </Link>
                    <span>/</span>
                    <span className="text-slate-700 font-medium truncate max-w-[300px]">
                        {interviewDetail?.jobPosition || "Interview Details"}
                    </span>
                </div>
                
                <button 
                    onClick={() => router.back()} 
                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                </button>

                {/* Premium Compact Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
                            {interviewDetail?.jobPosition}
                        </h1>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            {interviewDetail?.type && (
                                <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-md border ${typeColors[interviewDetail.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                    <Code className="h-3.5 w-3.5 mr-1.5" />
                                    {interviewDetail.type}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-white text-slate-600 border border-slate-200 shadow-sm">
                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                {interviewDetail?.duration}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-white text-slate-600 border border-slate-200 shadow-sm">
                                <Users className="h-3.5 w-3.5 text-slate-400" />
                                {candidates.length} Candidate{candidates.length !== 1 && 's'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-white text-slate-600 border border-slate-200 shadow-sm">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                Created {moment(interviewDetail?.created_at).format("MMM D, YYYY")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Action Area: Candidates & Analytics */}
            <div className="space-y-6">
                <CandidateAnalyticsBar candidates={candidates} />
                <CandidateList candidates={candidates} interviewId={interviewDetail?.interview_id} />
            </div>

            {/* Secondary Area: Interview Configuration */}
            <div className="pt-8">
                <InterviewConfiguration interviewDetail={interviewDetail} />
            </div>
            
        </div>
    )
}

export default InterviewDetail;
