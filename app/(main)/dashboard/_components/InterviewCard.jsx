import { Button } from "@/components/ui/button"
import { Copy, Send } from "lucide-react"
import moment from "moment"
import { toast } from "sonner";

function InterviewCard({interview}){
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
            <h2 className="mt-2">{interview?.duration}</h2>
            <div className="flex gap-3 w-full mt-5">
                <Button variant={"outline"} className="flex-1" onClick={CopyLink}>
                    <Copy className="mr-2 h-4 w-4" /> Copy Link
                </Button>
                <Button className="flex-1" onClick={onSend}>
                    <Send className="mr-2 h-4 w-4" /> Send
                </Button>
            </div>
        </div>
    )
}

export default InterviewCard
