"use client"
import { InterviewDataContext } from "@/context/InterviewDataContext";
import { Mic, Phone, Timer, Sparkles, Code2, MessageSquare } from "lucide-react";
import { useContext, useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Vapi from '@vapi-ai/web';
import { toast } from "sonner";
import AlertConfirmation from "./_components/AlertConfirmation";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { supabase } from "@/services/supabaseClient";

// Import Editor Components
import { WebSocketProvider } from '@/providers/websocket-provider';
import { wsClient } from '@/lib/websocket/client';
import { MonacoWorkspace } from '@/components/editor/monaco-workspace';
import { PresenceBar } from '@/components/editor/presence-bar';
import { ConnectionBadge } from '@/components/editor/connection-badge';

// Initialize Vapi once
const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);

function StartInterview() {
    const { interviewInfo } = useContext(InterviewDataContext);
    const router = useRouter();
    const { interview_id } = useParams();

    const [activeUser, setActiveUser] = useState(false);
    const [conversation, setConversation] = useState(null);
    const [time, setTime] = useState(0);
    const [mobileTab, setMobileTab] = useState("interview"); // "interview" | "code"
    const timerRef = useRef(null);
    const callStartedRef = useRef(false);

    const isTechnical = interviewInfo?.interviewData?.type === "Technical";

    const conversationRef = useRef(null);
    useEffect(() => { conversationRef.current = conversation; }, [conversation]);

    const GenerateFeedback = useCallback(async () => {
        try {
            if (!conversationRef.current) {
                toast.error("No conversation data to analyze.");
                return;
            }

            let codeSubmission = "";
            let codeLanguage = "";

            if (isTechnical) {
                try {
                    toast("Saving code submission...");
                    // 1. Flush explicit editor state
                    await wsClient.flushEditor();

                    // 2. Fetch latest code from Redis via API
                    const wsServerUrl = process.env.NEXT_PUBLIC_WS_SERVER_URL || "http://localhost:8080";
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    
                    const codeRes = await axios.get(`${wsServerUrl}/api/interviews/${interview_id}/code`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    codeSubmission = codeRes.data.code || "";
                    codeLanguage = codeRes.data.language || "javascript";
                } catch (err) {
                    console.error("Flush/Fetch code failed:", err);
                    toast.error("Code retrieval failed. AI will grade conversation only.");
                }
            }

            toast("Evaluating interview...");

            // 3. Persist Code Submission First (Error Resilience)
            const { data: insertedData, error: insertError } = await supabase
                .from("interview-feedback")
                .insert({
                    userName: interviewInfo?.userName,
                    userEmail: interviewInfo?.userEmail,
                    interview_id: interview_id,
                    code_submission: codeSubmission,
                    code_language: codeLanguage,
                    feedback: null, 
                    recommended: false,
                })
                .select();

            if (insertError || !insertedData || insertedData.length === 0) {
                console.error("Database insert error:", insertError);
                toast.error("Failed to initialize feedback record");
                return;
            }

            const recordId = insertedData[0].id;

            // 4. Generate AI Feedback
            try {
                const payload = { 
                    conversation: conversationRef.current, 
                    codeSubmission, 
                    codeLanguage 
                };
                const result = await axios.post("/api/ai-feedback", payload);
                const Content = result?.data?.content;

                const jsonMatch = Content?.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error("No JSON found in AI response");

                const feedbackData = JSON.parse(jsonMatch[0]);

                // 5. Update record with AI feedback
                const { error: updateError } = await supabase
                    .from("interview-feedback")
                    .update({ feedback: feedbackData })
                    .eq("id", recordId);
                    
                if (updateError) throw updateError;

                toast.success("Feedback generated successfully!");
            } catch (aiErr) {
                console.error("AI Evaluation failed:", aiErr);
                toast.error("AI Evaluation failed, but your code and recording were saved.");
            }

            router.replace(`/interview/${interview_id}/completed`);
        } catch (err) {
            console.error("Error generating feedback:", err);
            toast.error("Unexpected error occurred.");
        }
    }, [interviewInfo, interview_id, router, isTechnical]);

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
            model: {
                provider: "google",
                model: "gemini-2.0-flash",
                messages: [
                    {
                        role: "system",
                        content: `
                            You are an AI voice assistant conducting interviews.
                            Ask one question at a time and wait for the candidate's response.
                            Questions: ${questionList}
                            Keep it friendly.
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
            toast("Call Connected...");
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTime(prev => prev + 1);
            }, 1000);
        };

        const handleCallEnd = () => {
            toast("Interview Ended... Generating feedback.");
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            GenerateFeedback();
        };

        const handleSpeechStart = () => setActiveUser(false);
        const handleSpeechEnd = () => setActiveUser(true);
        const handleError = (error) => console.error("VAPI ERROR:", error);

        vapi.on("message", handleMessage);
        vapi.on("call-start", handleCallStart);
        vapi.on("call-end", handleCallEnd);
        vapi.on("speech-start", handleSpeechStart);
        vapi.on("speech-end", handleSpeechEnd);
        vapi.on("error", handleError);

        return () => {
            vapi.off("message", handleMessage);
            vapi.off("call-start", handleCallStart);
            vapi.off("call-end", handleCallEnd);
            vapi.off("speech-start", handleSpeechStart);
            vapi.off("speech-end", handleSpeechEnd);
            vapi.off("error", handleError);

            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [GenerateFeedback]);

    useEffect(() => {
        if (interviewInfo && !callStartedRef.current) {
            callStartedRef.current = true;
            startCall();
        }
        return () => {
            if (callStartedRef.current) {
                try { vapi.stop(); } catch (e) { /* ignore */ }
            }
        };
    }, [interviewInfo, startCall]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8 lg:px-12 xl:px-20 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl shadow-lg shadow-indigo-500/30">
                        <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">AI Interview Session</h1>
                        <p className="text-sm text-slate-500">{interviewInfo?.interviewData?.jobPosition || "Interview in progress"}</p>
                    </div>
                </div>
                
                {/* Mobile Tabs */}
                {isTechnical && (
                    <div className="flex lg:hidden bg-white/60 backdrop-blur-md p-1 rounded-xl shadow-sm border border-slate-200">
                        <button 
                            onClick={() => setMobileTab("interview")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mobileTab === 'interview' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <MessageSquare className="h-4 w-4" />
                            <span className="hidden sm:inline">Voice</span>
                        </button>
                        <button 
                            onClick={() => setMobileTab("code")}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mobileTab === 'code' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                            <Code2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Code</span>
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-slate-200">
                    <Timer className="h-5 w-5 text-indigo-600" />
                    <span className="font-mono text-lg font-semibold text-slate-700">{formatTime(time)}</span>
                </div>
            </div>

            {/* Layout Grid */}
            <div className={`flex-1 ${isTechnical ? 'lg:grid lg:grid-cols-12 lg:gap-8' : 'max-w-4xl mx-auto w-full'}`}>
                
                {/* Voice Column */}
                <div className={`${isTechnical ? 'lg:col-span-4' : ''} ${isTechnical && mobileTab === 'code' ? 'hidden lg:block' : 'block'} h-full`}>
                    <div className="flex flex-col h-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 flex-1">
                            <div className="group relative bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 shadow-xl shadow-indigo-100/30 p-8 flex flex-col items-center justify-center min-h-[350px] transition-all hover:shadow-2xl hover:shadow-indigo-100/40">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/40 to-blue-200/40 rounded-full blur-3xl" />
                                <div className="relative mb-6">
                                    {!activeUser && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 opacity-75 animate-ping" />}
                                    {!activeUser && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 opacity-30 animate-pulse scale-110" />}
                                    <div className="relative p-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500">
                                        <Image src="/Interviewer.png" alt="AI Recruiter" width={100} height={100} className="w-20 h-20 rounded-full object-cover border-4 border-white" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">AI Recruiter</h3>
                                <p className="text-sm text-slate-500">Conducting your interview</p>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${!activeUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <span className="text-xs font-medium text-slate-500">{!activeUser ? 'Speaking...' : 'Listening'}</span>
                                </div>
                            </div>

                            <div className="group relative bg-white/80 backdrop-blur-sm rounded-3xl border border-white/50 shadow-xl shadow-indigo-100/30 p-8 flex flex-col items-center justify-center min-h-[350px] transition-all hover:shadow-2xl hover:shadow-indigo-100/40">
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-200/40 to-teal-200/40 rounded-full blur-3xl" />
                                <div className="relative mb-6">
                                    {activeUser && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 opacity-75 animate-ping" />}
                                    {activeUser && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 opacity-30 animate-pulse scale-110" />}
                                    <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 text-white text-2xl font-bold shadow-lg shadow-blue-500/30">
                                        {interviewInfo?.userName?.[0]?.toUpperCase() || "?"}
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-1">{interviewInfo?.userName || "Candidate"}</h3>
                                <p className="text-sm text-slate-500">Interview Candidate</p>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${activeUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    <span className="text-xs font-medium text-slate-500">{activeUser ? 'Speaking...' : 'Listening'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col items-center mt-auto">
                            <div className="flex items-center justify-center gap-4 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50">
                                <button className="group relative p-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all hover:scale-105 active:scale-95">
                                    <Mic className="h-6 w-6" />
                                </button>
                                <AlertConfirmation stopInterview={stopInterview}>
                                    <button className="group relative p-4 bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-full shadow-lg shadow-red-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-red-500/40 active:scale-95">
                                        <Phone className="h-6 w-6" />
                                    </button>
                                </AlertConfirmation>
                            </div>
                            <div className="mt-6 flex items-center gap-2 text-slate-500">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-medium">Interview is in Progress</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Editor Column */}
                {isTechnical && (
                    <div className={`lg:col-span-8 ${mobileTab === 'interview' ? 'hidden lg:block' : 'block'} h-full`}>
                        <WebSocketProvider interviewId={interview_id}>
                            <div className="flex flex-col h-[700px] lg:h-[800px] w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                                    <div className="flex items-center gap-2">
                                        <Code2 className="h-5 w-5 text-indigo-600" />
                                        <span className="font-semibold text-slate-700">Code Editor</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <PresenceBar />
                                        <ConnectionBadge />
                                    </div>
                                </div>
                                <div className="flex-1 relative bg-[#1e1e1e]">
                                    <MonacoWorkspace />
                                </div>
                            </div>
                        </WebSocketProvider>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StartInterview;
