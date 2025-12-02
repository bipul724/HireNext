import { Button } from "@/components/ui/button"
import { ArrowRight, Copy, Send } from "lucide-react"
import moment from "moment"
import Link from "next/link";
import { toast } from "sonner";

function InterviewCard({interview,viewDetail=false}){
    const url = process.env.NEXT_PUBLIC_HOST_URL+'/'+interview?.interview_id;

    const CopyLink = () =>{
        
        navigator.clipboard.writeText(url);
        toast("Copied");
    }

    const onSend = () => {
        window.location.href = "mailto:bipulchamoli2002@gmail.com?subject=Interview Link & body=Interview Link: "+url;
    }


    return (
        <div className="p-5 bg-white rounded-lg border">
            <div className="flex items-center justify-between">
                <div className="h-[40px] w-[40px] rounded-full bg-primary"></div>
                <h2 className="text-sm ">{moment(interview?.created_at).format("DD MMM YYYY")}</h2>
            </div>
            <h2 className="mt-3 font-bold text-lg">{interview?.jobPosition}</h2>
            <h2 className="mt-2 flex justify-between text-gray-500">{interview?.duration}
                <span className="text-green-700">{interview["interview-feedback"]?.length || 0} Candidates</span>
            </h2>
            {!viewDetail ? <div className="flex gap-3 w-full mt-5">
                <Button variant={"outline"} className="flex-1" onClick={CopyLink}>
                    <Copy className="mr-2 h-4 w-4" /> Copy Link
                </Button>
                <Button className="flex-1" onClick={onSend}>
                    <Send className="mr-2 h-4 w-4" /> Send
                </Button>
            </div> : 
            <Link href={"/scheduled-interview/"+interview?.interview_id+"/details"}>
            <Button className={"mt-5 w-full"} variant={"outline"}>View Detail <ArrowRight /></Button>
            </Link> }
        </div>
    )
}

export default InterviewCard
