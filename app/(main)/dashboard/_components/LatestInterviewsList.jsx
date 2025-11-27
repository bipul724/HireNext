"use client"
import { Button } from "@/components/ui/button"
import { Camera, VideoIcon } from "lucide-react"
import { useState } from "react"

function LatestInterviewsList(){
    const [interviews, setInterviewsList] = useState([])
    return (
        <div className="my-5">
            <h2 className="font-bold text-2xl">Previously Created Interviews</h2>
            {interviews?.length==0 && 
            <div className="p-5 flex flex-col items-center gap-2  p-5 mt-5">
                <VideoIcon className="h-10 w-10 text-primary" />
                <h2>You don't have any interviews created yet</h2>
                <Button>Create New Interview</Button>
                
            </div> }
        </div>
    )
}

export default LatestInterviewsList

