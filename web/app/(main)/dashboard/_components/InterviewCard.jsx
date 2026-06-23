import { Button } from "@/components/ui/button"
import { ArrowRight, Copy, Send, Clock, Users } from "lucide-react"
import moment from "moment"
import Link from "next/link";
import { toast } from "sonner";

const typeColors = {
    'Technical': 'bg-sky-50 text-sky-700 border-sky-100',
    'Behavioral': 'bg-violet-50 text-violet-700 border-violet-100',
    'Experience': 'bg-amber-50 text-amber-700 border-amber-100',
    'Problem Solving': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Leadership': 'bg-rose-50 text-rose-700 border-rose-100',
}

function InterviewCard({interview,viewDetail=false}){
    const url = process.env.NEXT_PUBLIC_HOST_URL+'/'+interview?.interview_id;
    const candidateCount = interview?.["interview-feedback"]?.length || 0;

    const CopyLink = () =>{
        
        navigator.clipboard.writeText(url);
        toast("Copied");
    }

    const onSend = () => {
        window.location.href = "mailto:bipulchamoli2002@gmail.com?subject=Interview Link & body=Interview Link: "+url;
    }


    return (
        <div className="group bg-white rounded-xl border border-slate-200/80 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 flex flex-col">
            {/* ── Header: Avatar + Status + Date ── */}
            <div className="p-4 pb-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-semibold text-sm shadow-sm shadow-teal-500/20">
                            {interview?.jobPosition?.[0]?.toUpperCase() || "I"}
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-semibold text-sm text-slate-900 line-clamp-1 leading-tight">{interview?.jobPosition}</h2>
                            <span className="text-[11px] text-slate-400 font-medium">{moment(interview?.created_at).format("DD MMM YYYY")}</span>
                        </div>
                    </div>
                    <span className={`shrink-0 h-2 w-2 rounded-full ring-2 ring-white ${candidateCount > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
            </div>

            {/* ── Metadata chips ── */}
            <div className="px-4 pt-3 pb-3 flex flex-wrap gap-1.5">
                {interview?.type && (
                    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md border ${typeColors[interview.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {interview.type}
                    </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                    <Clock className="h-3 w-3" />
                    {interview?.duration}
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    candidateCount > 0
                        ? 'bg-teal-50 text-teal-700 border-teal-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                    <Users className="h-3 w-3" />
                    {candidateCount} candidate{candidateCount !== 1 ? "s" : ""}
                </span>
            </div>

            {/* ── Actions ── */}
            <div className="mt-auto px-4 pb-4 pt-0">
                {!viewDetail ? <div className="flex gap-2 w-full">
                    <Button variant={"outline"} size="sm" className="flex-1 h-8 text-xs" onClick={CopyLink}>
                        <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Link
                    </Button>
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={onSend}>
                        <Send className="mr-1.5 h-3.5 w-3.5" /> Send
                    </Button>
                </div> :
                <Link href={"/scheduled-interview/"+interview?.interview_id+"/details"}>
                    <Button size="sm" className={"w-full h-8 text-xs"} variant={"outline"}>
                        View Detail <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Button>
                </Link> }
            </div>
        </div>
    )
}

export default InterviewCard
