"use client"
import { useUser } from "@/app/provider";
import { Button } from "@/components/ui/button"
import { supabase } from "@/services/supabaseClient";
import { Camera, VideoIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useEffect } from "react"
import InterviewCard from "./InterviewCard";

function LatestInterviewsList() {
    const [interviewsList, setInterviewsList] = useState([]);
    const { user } = useUser();

    useEffect(() => {
        user && GetInterviewList();
    }, [user])

    const GetInterviewList = async () => {
        let { data: Interviews, error } = await supabase
            .from("Interviews")
            .select('*')
            .eq("userEmail", user?.email)
            .order("created_at", { ascending: false })
            .limit(6);

        console.log(Interviews);
        setInterviewsList(Interviews);

    }




    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-lg text-slate-900">Previously Created Interviews</h2>
                {interviewsList?.length > 0 &&
                    <span className="text-sm font-medium text-slate-400">{interviewsList.length} shown</span>}
            </div>
            {interviewsList?.length == 0 &&
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center text-center gap-3">
                    <span className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                        <VideoIcon className="h-7 w-7" />
                    </span>
                    <h3 className="font-semibold text-slate-900">No interviews yet</h3>
                    <p className="text-sm text-slate-500 max-w-sm">Create your first AI interview and share the link with candidates to get started.</p>
                    <Link href="/dashboard/create-interview" className="mt-1">
                        <Button>Create New Interview</Button>
                    </Link>
                </div>}
            {interviewsList &&
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {interviewsList?.map((interview, index) => (
                        <InterviewCard key={index} interview={interview} />
                    ))}
                </div>}
        </div>
    )
}

export default LatestInterviewsList

