"use client"
import { useUser } from "@/app/provider";
import { Button } from "@/components/ui/button"
import { supabase } from "@/services/supabaseClient";
import { Camera, VideoIcon } from "lucide-react"
import { useState } from "react"
import { useEffect } from "react"
import InterviewCard from "./InterviewCard";

function LatestInterviewsList(){
    const [interviewsList, setInterviewsList] = useState([]);
    const {user} = useUser();

    useEffect(() => {
        user && GetInterviewList();
    },[user])

    const GetInterviewList = async () => {
        let {data : Interviews , error } = await supabase
            .from("Interviews")
            .select('*')
            .eq("userEmail",user?.email)
            .order("created_at", { ascending: false })
            .limit(6);

        console.log(Interviews);
        setInterviewsList(Interviews);
        
    }

    


    return (
        <div className="my-5">
            <h2 className="font-bold text-2xl">Previously Created Interviews</h2>
            {interviewsList?.length==0 && 
            <div className="bg-white border border-gray-200 rounded-lg p-5 mt-3 flex flex-col items-center gap-2  p-5 mt-5">
                <VideoIcon className="h-10 w-10 text-primary" />
                <h2>You don't have any interviews created yet</h2>
                <Button>Create New Interview</Button>

                
            </div> }
            {interviewsList && 
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-5 mt-3">
                {interviewsList?.map((interview,index)=>(
                    <InterviewCard key={index} interview={interview} />
                ))}
              </div>}
        </div>
    )
}

export default LatestInterviewsList

