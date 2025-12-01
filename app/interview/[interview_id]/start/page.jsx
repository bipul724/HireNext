"use client"
import { InterviewDataContext } from "@/context/InterviewDataContext";
import { Mic, Phone, Timer } from "lucide-react";
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
    const [conversation, setConversation] = useState(null); // store an object/array as returned
    const [time, setTime] = useState(0);
    const timerRef = useRef(null);

    // Keep a ref to latest conversation so handlers don't use stale state
    const conversationRef = useRef(null);
    useEffect(() => { conversationRef.current = conversation; }, [conversation]);

    // Safe GenerateFeedback with useCallback so handlers can reference it reliably
    const GenerateFeedback = useCallback(async () => {
        try {
            if (!conversationRef.current) {
                toast.error("No conversation data to analyze.");
                return;
            }

            // If you stored conversation as an object/array, send that directly.
            // If you stored a string, send the string. Adjust according to your API.
            const payload = { conversation: conversationRef.current };

            const result = await axios.post("/api/ai-feedback", payload);
            console.log("AI feedback response:", result.data);

            const Content = result?.data?.content;
            if (!Content || typeof Content !== "string") {
                toast.error("Invalid AI feedback response.");
                console.error("Invalid content:", Content);
                return;
            }

            // Extract JSON object
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

    // Stop call helper
    const stopInterview = useCallback(() => {
        try { vapi.stop(); }
        catch (e) { console.warn("vapi.stop failed", e); }
    }, []);

    // Start call uses interviewInfo
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
                            Ask one question at a time and wait for the candidate’s response.
                            Questions: ${questionList}
                            Keep it friendly, focused on React.
                        `.trim()
                    }
                ]
            }
        };

        vapi.start(assistantOptions);
    }, [interviewInfo]);

    // Attach event listeners once (stable handlers)
    useEffect(() => {
        const handleMessage = (message) => {
            if (message?.conversation) {
                // store the conversation as parsed object; adjust if your API expects string
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
            // keep time if you want final value; else setTime(0);
            // setTime(0);

            // Call GenerateFeedback (use ref or callback)
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
    }, [GenerateFeedback]); // stable because GenerateFeedback is useCallback

    // Start the call when interviewInfo becomes available
    useEffect(() => {
        if (interviewInfo) startCall();
        // optionally return a cleanup that stops vapi on interviewInfo change/unmount
        return () => {
            // optional: stop ongoing call when interviewInfo changes or component unmounts
            // vapi.stop();
        };
    }, [interviewInfo, startCall]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    }

    return (
        <div className="p-20 lg:px-48 xl:px-58">
            <h2 className="text-xl font-bold flex justify-between">
                AI Interview Session
                <span className="flex gap-2 items-center">
                    <Timer />{formatTime(time)}
                </span>
            </h2>

            {/* cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-7 mt-5">
                <div className="bg-white h-[400px] rounded-lg border flex flex-col gap-3 items-center justify-center">
                    <div className="relative">
                        {!activeUser && <span className="absolute inset-0 rounded-full bg-blue-500 opacity-75 animate-ping"></span>}
                        <Image src="/Interviewer.png" alt="Interviewer" width={100} height={100} className="w-[60px] h-[60px] rounded-full object-cover" />
                    </div>
                    <h2>AI Recruiter</h2>
                </div>

                <div className="bg-white h-[400px] rounded-lg border flex flex-col gap-3 items-center justify-center">
                    <div className="relative">
                        {activeUser && <span className="absolute inset-0 rounded-full bg-blue-500 opacity-75 animate-ping"></span>}
                        <h2 className="text-2xl bg-primary text-white p-3 rounded-full px-5">{interviewInfo?.userName?.[0]}</h2>
                    </div>
                    <h2>{interviewInfo?.userName}</h2>
                </div>
            </div>

            <div className="flex items-center justify-center gap-5 mt-7">
                <Mic className="h-12 w-12 p-3 bg-gray-500 text-white rounded-full cursor-pointer" />
                <AlertConfirmation stopInterview={stopInterview}>
                    <Phone className="h-12 w-12 p-3 text-white bg-red-500 rounded-full cursor-pointer" />
                </AlertConfirmation>
            </div>

            <h2 className="text-center text-gray-500 mt-5">Interview is in Progress...</h2>
        </div>
    );
}

export default StartInterview;
