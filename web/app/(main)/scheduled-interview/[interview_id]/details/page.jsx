"use client"

import { useParams } from "next/navigation";
import { useUser } from "@/app/provider";
import { useEffect, useState } from "react";
import { supabase } from "@/services/supabaseClient";
import InterviewDetailContainer from "../_components/InterviewDetailContainer";
import CandidateList from "../_components/CandidateList";

function InterviewDetail(){
    const {interview_id} = useParams();
    const {user} = useUser();
    const [interviewDetail,setInterviewDetail] = useState();

    useEffect(() => {
        user && GetInterviewDetail();
    }, [user]);

    const GetInterviewDetail = async () => {
        const { data, error } = await supabase.from("Interviews")
                    .select(`jobPosition,jobDescription,type,questionList,duration,interview_id,created_at,
                        interview-feedback(userEmail,userName,feedback,created_at)`)
                    .eq("userEmail", user?.email)
                    .eq("interview_id", interview_id);

        setInterviewDetail(data[0]);

                    console.log(data);
                    
        
    }
    return(
        <div className="mt-5">
            <h2 className="font-bold text-2xl">Interview Details</h2>
            <InterviewDetailContainer interviewDetail={interviewDetail}/>
            <CandidateList candidateList={interviewDetail?.['interview-feedback']}/>
        </div>
    )
}

export default InterviewDetail
