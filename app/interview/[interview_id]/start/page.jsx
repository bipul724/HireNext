"use client"
import { InterviewDataContext } from "@/context/InterviewDataContext";
import { Mic, Phone, Timer, Sparkles } from "lucide-react";
import { useContext, useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Vapi from '@vapi-ai/web';
import { toast } from "sonner";
import AlertConfirmation from "./_components/AlertConfirmation";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { supabase } from "@/services/supabaseClient";

// Initialize Vapi once (NEXT_PUBLIC key is safe to expose)
const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);

function StartInterview() {
    const { interviewInfo } = useContext(InterviewDataContext);
    const router = useRouter();
    const { interview_id } = useParams();

    const [activeUser, setActiveUser] = useState(false);
    const [conversation, setConversation] = useState(null);
    const [time, setTime] = useState(0);
    const timerRef = useRef(null);

    const conversationRef = useRef(null);
    useEffect(() => { conversationRef.current = conversation; }, [conversation]);

    const GenerateFeedback = useCallback(async () => {
        try {
            if (!conversationRef.current) {
                toast.error("No conversation data to analyze.");
                return;
            }

            const payload = { conversation: conversationRef.current };
            const result = await axios.post("/api/ai-feedback", payload);
            console.log("AI feedback response:", result.data);

            const Content = result?.data?.content;
            if (!Content || typeof Content !== "string") {
                toast.error("Invalid AI feedback response.");
                console.error("Invalid content:", Content);
                return;
            }

            const jsonMatch = Content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error("No JSON found in AI response:", Content);
                toast.error("Invalid feedback format received");
                return;
            }

            const FINAL_CONTENT = jsonMatch[0];

            let feedbackData;
            try {
                feedbackData = JSON.parse(FINAL_CONTENT);
            } catch (parseErr) {
                console.error("Failed to parse feedback JSON:", parseErr, FINAL_CONTENT);
                toast.error("Received malformed feedback from AI");
                return;
            }

            const { data, error } = await supabase
                .from("interview-feedback")
                .insert({
                    userName: interviewInfo?.userName,
                    userEmail: interviewInfo?.userEmail,
                    feedback: feedbackData,
                    interview_id: interview_id,
                    recommended: false,
                })
                .select();

            if (error) {
                console.error("Database error:", error);
                toast.error("Failed to save feedback");
                return;
            }

            console.log("Saved feedback:", data);
            router.replace(`/interview/${interview_id}/completed`);
        } catch (err) {
            console.error("Error generating feedback:", err);
            toast.error("Failed to generate feedback. Please try again.");
        }
    }, [interviewInfo, interview_id, router]);

    const stopInterview = useCallback(() => {
        try { vapi.stop(); }
        catch (e) { console.warn("vapi.stop failed", e); }
    }, []);

    const startCall = useCallback(() => {
        let questionList = "";
        interviewInfo?.interviewData?.questionList?.forEach(item => {
            questionList += (item?.question ?? "") + ", ";
        });

        const assistantOptions = {
            name: "AI Recruiter",
            firstMessage: `Hi ${interviewInfo?.userName}, how are you? Ready for your interview on ${interviewInfo?.interviewData?.jobPosition}?`,
            transcriber: {
                provider: "deepgram",
                model: "nova-2",
                language: "en-US",
            },
            voice: {
                provider: "playht",
                voiceId: "jennifer",
            },
            model: {
                provider: "openai",
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `
                            You are an AI voice assistant conducting interviews.
                            Ask one question at a time and wait for the candidate's response.
                            Questions: ${questionList}
                            Keep it friendly, focused on React.
                        `.trim()
                    }
                ]
            }
        };

        vapi.start(assistantOptions);
    }, [interviewInfo]);

    useEffect(() => {
        const handleMessage = (message) => {
            if (message?.conversation) {
                setConversation(message.conversation);
            }
        };

        const handleCallStart = () => {
            console.log("Call has started");
            toast("Call Connected...");

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTime(prev => prev + 1);
            }, 1000);
        };

        const handleCallEnd = () => {
            console.log("Call has ended");
            toast("Interview Ended... Generating feedback.");

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            GenerateFeedback();
        };

        const handleSpeechStart = () => {
            setActiveUser(false);
        };

        const handleSpeechEnd = () => {
            setActiveUser(true);
        };

        vapi.on("message", handleMessage);
        vapi.on("call-start", handleCallStart);
        vapi.on("call-end", handleCallEnd);
        vapi.on("speech-start", handleSpeechStart);
        vapi.on("speech-end", handleSpeechEnd);

        return () => {
            vapi.off("message", handleMessage);
            vapi.off("call-start", handleCallStart);
            vapi.off("call-end", handleCallEnd);
            vapi.off("speech-start", handleSpeechStart);
            vapi.off("speech-end", handleSpeechEnd);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [GenerateFeedback]);

    useEffect(() => {
        if (interviewInfo) startCall();
        return () => { };
    }, [interviewInfo, startCall]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-10 lg:px-20 xl:px-32">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/30">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">AI Interview Session</h1>
                        <p className="text-sm text-slate-500">{interviewInfo?.interviewData?.jobPosition || "Interview in progress"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200">
                    <Timer className="h-5 w-5 text-indigo-600" />
                    <span className="font-mono text-lg font-semibold text-slate-700">{formatTime(time)}</span>
                </div>
            </div>

            {/* Main Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* AI Recruiter Card */}
                <div className="group relative bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 shadow-xl shadow-indigo-100/30 p-8 flex flex-col items-center justify-center min-h-[350px] transition-all hover:shadow-2xl hover:shadow-indigo-100/40">
                    {/* Decorative gradient blob */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/40 to-blue-200/40 rounded-full blur-3xl" />

                    <div className="relative mb-6">
                        {/* Speaking indicator ring */}
                        {!activeUser && (
                            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 opacity-75 animate-ping" />
                        )}
                        {!activeUser && (
                            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 opacity-30 animate-pulse scale-110" />
                        )}
                        <div className="relative p-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500">
                            <Image
                                src="/Interviewer.png"
                                alt="AI Recruiter"
                                width={100}
                                height={100}
                                className="w-20 h-20 rounded-full object-cover border-4 border-white"
                            />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">AI Recruiter</h3>
                    <p className="text-sm text-slate-500">Conducting your interview</p>

                    {/* Status indicator */}
                    <div className="mt-4 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${!activeUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-xs font-medium text-slate-500">
                            {!activeUser ? 'Speaking...' : 'Listening'}
                        </span>
                    </div>
                </div>

                {/* Candidate Card */}
                <div className="group relative bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 shadow-xl shadow-indigo-100/30 p-8 flex flex-col items-center justify-center min-h-[350px] transition-all hover:shadow-2xl hover:shadow-indigo-100/40">
                    {/* Decorative gradient blob */}
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-200/40 to-teal-200/40 rounded-full blur-3xl" />

                    <div className="relative mb-6">
                        {/* Speaking indicator ring */}
                        {activeUser && (
                            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 opacity-75 animate-ping" />
                        )}
                        {activeUser && (
                            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 opacity-30 animate-pulse scale-110" />
                        )}
                        <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 text-white text-2xl font-bold shadow-lg shadow-blue-500/30">
                            {interviewInfo?.userName?.[0]?.toUpperCase() || "?"}
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-1">{interviewInfo?.userName || "Candidate"}</h3>
                    <p className="text-sm text-slate-500">Interview Candidate</p>

                    {/* Status indicator */}
                    <div className="mt-4 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${activeUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className="text-xs font-medium text-slate-500">
                            {activeUser ? 'Speaking...' : 'Listening'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center">
                <div className="flex items-center justify-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50">
                    <button className="group relative p-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all hover:scale-105 active:scale-95">
                        <Mic className="h-6 w-6" />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-slate-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Microphone
                        </span>
                    </button>

                    <AlertConfirmation stopInterview={stopInterview}>
                        <button className="group relative p-4 bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-full shadow-lg shadow-red-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-red-500/40 active:scale-95">
                            <Phone className="h-6 w-6" />
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-slate-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                End Call
                            </span>
                        </button>
                    </AlertConfirmation>
                </div>

                {/* Status message */}
                <div className="mt-6 flex items-center gap-2 text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium">Interview is in Progress</span>
                </div>
            </div>
        </div>
    );
}

export default StartInterview;
