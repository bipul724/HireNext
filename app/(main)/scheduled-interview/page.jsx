"use client"
import { useUser } from "@/app/provider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/services/supabaseClient";
import { VideoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import InterviewCard from "../dashboard/_components/InterviewCard";

function ScheduledInterview() {

    const { user } = useUser();
    const [interviewsList, setInterviewsList] = useState([]);

    useEffect(() => {
        user &&GetInterviewList();
    }, [user]);

    const GetInterviewList = async () => {
        const { data, error } = await supabase.from("Interviews")
            .select("jobPosition,duration,interview_id,created_at,interview-feedback(userEmail)")
            .eq("userEmail", user?.email)
            .order("interview_id", { ascending: false })

        console.log(data);
        setInterviewsList(data);
            
    }

    return (
        <div className="mt-5">
            <h2 className="font-bold text-xl">Interview List with Candidate Feedback</h2>
             {interviewsList?.length==0 && 
            <div className="bg-white border border-gray-200 rounded-lg p-5 mt-3 flex flex-col items-center gap-2  p-5 mt-5">
                <VideoIcon className="h-10 w-10 text-primary" />
                <h2>You don't have any interviews created yet</h2>
                <Button>Create New Interview</Button>

                
            </div> }
            {interviewsList && 
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-5 mt-3">
                {interviewsList?.map((interview,index)=>(
                    <InterviewCard key={index} interview={interview} viewDetail={true}/>
                ))}
              </div>}
        </div>
    );
}

export default ScheduledInterview;
