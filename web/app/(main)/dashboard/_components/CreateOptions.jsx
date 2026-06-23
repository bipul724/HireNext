import { VideoIcon, ArrowRight } from "lucide-react"
import Link from "next/link"

function CreateOptions(){
    return (
        <Link
            href={"/dashboard/create-interview"}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 sm:p-6 rounded-2xl cursor-pointer shadow-sm transition-all hover:shadow-md hover:border-teal-200"
        >
            <div className="flex items-center gap-4">
                <span className="p-3 text-teal-600 bg-teal-50 rounded-xl shrink-0">
                    <VideoIcon className="h-6 w-6" />
                </span>
                <div>
                    <h2 className="font-semibold text-slate-900">Create New Interview</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Create AI Interviews and schedule them with candidates</p>
                </div>
            </div>
            <span className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/30 transition-all group-hover:bg-teal-700 group-hover:shadow-md">
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
        </Link>
    )
}

export default CreateOptions
