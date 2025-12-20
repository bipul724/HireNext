"use client"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/services/supabaseClient";
import { Clock, Info, Loader2Icon, Video } from "lucide-react";
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
    const [userName, setUserName] = useState();
    const [userEmail, setUserEmail] = useState();
    const [loading, setLoading] = useState(false);
    const { interviewInfo, setInterviewInfo } = useContext(InterviewDataContext);
    const router = useRouter();
    // [loading,setLoading] = useState(false);

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

        // Now 'Interviews' will be defined
        if (Interviews && Interviews.length > 0) {
            console.log(Interviews[0]);
            setInterviewInfo({
                userName: userName,
                userEmail: userEmail,
                //questionList : Interviews[0].questionList,
                interviewData: Interviews[0]
            });
            router.push(`/interview/${interview_id}/start`);
            // Add your navigation logic here, e.g., router.push(...)
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

    return (
        <div className="px-10 md:px-28 lg:px-48 xl:px-64 mt-10">
            <div className="flex flex-col items-center justify-center mb-20 border rounded-lg bg-white p-7 lg:px-32 xl:px-52">
                <Logo size="lg" />
                <h2 className="mt-3">AI-Powered Interview Platform</h2>
                <Image
                    src="/interviewIcon.png"
                    alt="interview"
                    width={500}
                    height={500}
                    className="w-[280px] my-6"
                />

                <h2 className="font-bold text-xl">{interviewData?.jobPosition}</h2>
                <h2 className="flex gap-2 items-center text-gray-500 mt-3"><Clock className="h-4 w-4" />{interviewData?.duration}</h2>
                <div className="w-full">
                    <h2 >Enter your full name</h2>
                    <Input className="mt-2" placeholder="Enter your full name" onChange={(e) => setUserName(e.target.value)} />
                </div>
                <div className="w-full ">
                    <h2 className="mt-2">Enter your email</h2>
                    <Input className="mt-2" placeholder="Enter your email" onChange={(e) => setUserEmail(e.target.value)} />
                </div>
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 w-full my-5">
                    <div className="flex gap-2.5 items-center text-gray-900 font-bold text-sm md:text-base">
                        <Info className="w-5 h-5 text-blue-600" />
                        <h2>Before you begin</h2>
                    </div>
                    <ul className="mt-2 text-blue-500 font-medium text-xs md:text-sm space-y-1.5 list-none">
                        <li>- Ensure you have a stable internet connection</li>
                        <li>- Test your camera and microphone</li>
                        <li>- Ensure you have a quiet environment</li>
                    </ul>
                </div>
                <Button className="w-full mt-1 font-bold"
                    disabled={loading || !userName
                        || !interviewData}
                    onClick={() => joinInterview()}
                ><Video />{loading && <Loader2Icon />}Join Interview</Button>
            </div>

        </div>
    );
}

export default Interview;
