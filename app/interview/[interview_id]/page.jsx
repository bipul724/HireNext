"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/services/supabaseClient";
import { Clock, Info, Loader2Icon, Video, User, Mail, CheckCircle } from "lucide-react";
import Image from "next/image";
import Logo from "@/components/Logo";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useContext } from "react";
import { InterviewDataContext } from "@/context/InterviewDataContext";

function Interview() {
    const { interview_id } = useParams();
    console.log(interview_id);

    const [interviewData, setInterviewData] = useState();
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const { interviewInfo, setInterviewInfo } = useContext(InterviewDataContext);
    const router = useRouter();

    useEffect(() => {
        interview_id && GetInterviewData();
    }, [interview_id]);

    const joinInterview = async () => {
        setLoading(true);
        let { data: Interviews, error } = await supabase
            .from("Interviews")
            .select("*")
            .eq("interview_id", interview_id);

        if (error) {
            console.log(error);
            toast("Incorrect Interview Link");
            return;
        }

        if (Interviews && Interviews.length > 0) {
            console.log(Interviews[0]);
            setInterviewInfo({
                userName: userName,
                userEmail: userEmail,
                interviewData: Interviews[0]
            });
            router.push(`/interview/${interview_id}/start`);
        } else {
            toast("Interview not found");
        }

        setLoading(false);
    }

    const GetInterviewData = async () => {
        setLoading(true);
        try {
            const { data: Interviews, error } = await supabase
                .from("Interviews")
                .select("jobPosition,jobDescription,duration,type")
                .eq("interview_id", interview_id);

            setInterviewData(Interviews[0]);
            setLoading(false);
            if (Interviews?.length === 0) {
                toast("Incorrect Interview Link");
                return;
            }
        }
        catch (error) {
            console.log(error);
            setLoading(false);
            toast("Incorrect Interview Link");
        }
    }

    const requirements = [
        "Stable internet connection",
        "Working camera and microphone",
        "Quiet environment"
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
            <div className="max-w-lg mx-auto">
                {/* Main Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-100/50 border border-white/50 overflow-hidden">

                    {/* Header Section */}
                    <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-8 text-center">
                        <div className="inline-flex items-center justify-center gap-2 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold text-white">
                                Hire<span className="text-indigo-200">Next</span>
                            </span>
                        </div>
                        <p className="text-indigo-100 text-sm font-medium">AI-Powered Interview Platform</p>
                    </div>

                    {/* Content Section */}
                    <div className="p-8">
                        {/* Interview Image */}
                        <div className="flex justify-center -mt-12 mb-6">
                            <div className="bg-white rounded-2xl p-3 shadow-lg shadow-indigo-100/50 border border-slate-100">
                                <Image
                                    src="/interviewIcon.png"
                                    alt="interview"
                                    width={200}
                                    height={200}
                                    className="w-[140px] h-[140px] object-contain"
                                />
                            </div>
                        </div>

                        {/* Job Info */}
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-slate-800 mb-2">
                                {interviewData?.jobPosition || "Loading..."}
                            </h1>
                            <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm font-medium">
                                <Clock className="h-4 w-4" />
                                <span>{interviewData?.duration || "..."}</span>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="space-y-5">
                            {/* Name Input */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <User className="h-4 w-4 text-indigo-500" />
                                    Full Name
                                </label>
                                <Input
                                    className="h-12 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
                                    placeholder="Enter your full name"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                />
                            </div>

                            {/* Email Input */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                    <Mail className="h-4 w-4 text-indigo-500" />
                                    Email Address
                                </label>
                                <Input
                                    className="h-12 rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
                                    placeholder="Enter your email"
                                    type="email"
                                    value={userEmail}
                                    onChange={(e) => setUserEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Requirements Card */}
                        <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 rounded-lg bg-blue-100">
                                    <Info className="w-4 h-4 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-slate-800">Before you begin</h3>
                            </div>
                            <ul className="space-y-2.5">
                                {requirements.map((req, index) => (
                                    <li key={index} className="flex items-center gap-3 text-sm text-slate-600">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                        <span>{req}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Join Button */}
                        <Button
                            className="w-full mt-6 h-14 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-base shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            disabled={loading || !userName || !interviewData}
                            onClick={() => joinInterview()}
                        >
                            {loading ? (
                                <Loader2Icon className="w-5 h-5 animate-spin mr-2" />
                            ) : (
                                <Video className="w-5 h-5 mr-2" />
                            )}
                            Join Interview
                        </Button>

                        {/* Footer */}
                        <p className="text-center text-xs text-slate-400 mt-6">
                            By joining, you agree to our Terms of Service
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Interview;
