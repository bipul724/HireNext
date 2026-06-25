"use client"
import { InterviewDataContext } from "@/context/InterviewDataContext";
import { Mic, Phone, Timer, Code2, MessageSquare } from "lucide-react";
import { useContext, useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import Logo from "@/components/Logo";
import Vapi from '@vapi-ai/web';
import { toast } from "sonner";
import AlertConfirmation from "./_components/AlertConfirmation";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { supabase } from "@/services/supabaseClient";

// Import Editor Components
import { WebSocketProvider } from '@/providers/websocket-provider';
import { wsClient } from '@/lib/websocket/client';
import dynamic from "next/dynamic";

const MonacoWorkspace = dynamic(
  () => import('@/components/editor/monaco-workspace').then((mod) => mod.MonacoWorkspace),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-slate-400">Loading code editor...</div> }
);
import { PresenceBar } from '@/components/editor/presence-bar';
import { ConnectionBadge } from '@/components/editor/connection-badge';
import { CodingChallengeModal } from '@/components/editor/coding-challenge-modal';
import { useCodingStore } from '@/store/use-coding-store';

// Initialize Vapi safely
let vapi = null;
try {
    if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) {
        vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY);
    }
} catch (e) {
    console.error("Vapi initialization failed:", e);
}

// Parse "5 minutes" / "30 minutes" / "1 hour" → seconds.
// Adds a 5-min grace buffer so Vapi never cuts off before our own UI timer, and
// clamps to Vapi's allowed range (10..43200s).
const parseInterviewDurationSeconds = (raw) => {
    if (!raw) return 3600;
    const s = String(raw).toLowerCase();
    const n = parseInt(s, 10);
    if (Number.isNaN(n)) return 3600;
    const secs = /hour|hr/.test(s) ? n * 3600 : n * 60;
    return Math.min(Math.max(secs + 300, 600), 43200);
};

// Extract a structured tool/function call from a Vapi `message` event.
// Supports the current SDK shape ("tool-calls" with toolCallList/toolCalls) and
// the legacy "function-call" shape. Returns { name, args } or null.
const extractToolCall = (message) => {
    if (!message) return null;
    if (message.type === "tool-calls") {
        const list = message.toolCallList || message.toolCalls || [];
        const tc = Array.isArray(list) ? list[0] : null;
        const fn = tc?.function;
        if (fn?.name) {
            let args = fn.arguments;
            if (typeof args === "string") {
                try { args = JSON.parse(args); } catch { args = {}; }
            }
            return { name: fn.name, args: args || {} };
        }
    }
    if (message.type === "function-call" && message.functionCall?.name) {
        return { name: message.functionCall.name, args: message.functionCall.parameters || {} };
    }
    return null;
};

// Structured telemetry. Always logs to the console as JSON; additionally makes a
// best-effort, non-blocking persist to an optional `interview-events` table.
// A missing table simply returns an error we ignore — telemetry must never break
// the interview.
const logInterviewEvent = (event, data = {}) => {
    const entry = {
        event,
        ts: new Date().toISOString(),
        online: typeof navigator !== "undefined" ? navigator.onLine : null,
        ...data,
    };
    try {
        supabase
            .from("interview-events")
            .insert(entry)
            .then(({ error }) => {
                // silently drop
            });
    } catch (_) {
        /* never let telemetry throw */
    }
};

function StartInterview() {
    const { interviewInfo } = useContext(InterviewDataContext);
    const router = useRouter();
    const { interview_id } = useParams();

    const [activeUser, setActiveUser] = useState(false);
    const [conversation, setConversation] = useState(null);
    const [time, setTime] = useState(0);
    const [mobileTab, setMobileTab] = useState("interview"); // "interview" | "code"
    const [vapiError, setVapiError] = useState(null);
    const timerRef = useRef(null);
    const callStartedRef = useRef(false);

    // Diagnostics bookkeeping (refs so they don't trigger re-renders or
    // re-register the Vapi listeners). Captured for LOGGING ONLY — not used to
    // alter termination behavior.
    const endedByUserRef = useRef(false);     // candidate clicked End Interview
    const lastEndedReasonRef = useRef(null);  // captured from status-update messages
    const timeRef = useRef(0);                // elapsed seconds, read in handlers

    const isTechnical = interviewInfo?.interviewData?.type === "Technical";
    const codingActive = useCodingStore((s) => s.phase === "coding");

    const conversationRef = useRef(null);
    useEffect(() => { conversationRef.current = conversation; }, [conversation]);

    // Fresh interview session — clear any stale Coding Challenge state. If a
    // round is genuinely in progress, the WS `coding:sync` on connect restores it.
    useEffect(() => { useCodingStore.getState().reset(); }, []);

    const GenerateFeedback = useCallback(async (reason = "candidate_end") => {
        try {
            if (!conversationRef.current) {
                toast.error("No conversation data to analyze.");
                return;
            }

            // Idempotency / re-entry guard: if this candidate already has a
            // submission for this interview, never create a duplicate — just send
            // them to the completed page.
            try {
                const { data: existingFb } = await supabase
                    .from("interview-feedback")
                    .select("id")
                    .eq("interview_id", interview_id)
                    .eq("userEmail", interviewInfo?.userEmail)
                    .limit(1);
                if (existingFb && existingFb.length > 0) {
                    router.replace(`/interview/${interview_id}/completed`);
                    return;
                }
            } catch (_) { /* non-fatal: fall through to normal flow */ }

            let codeSubmission = "";
            let codeLanguage = "";

            if (isTechnical) {
                try {
                    toast("Saving code submission...");
                    // 1. Flush explicit editor state
                    await wsClient.flushEditor();

                    // 2. Fetch latest code from Redis via API
                    let wsServerUrl = process.env.NEXT_PUBLIC_WS_SERVER_URL;
                    if (!wsServerUrl) {
                        if (process.env.NODE_ENV === "production") {
                            throw new Error("NEXT_PUBLIC_WS_SERVER_URL is missing in production");
                        }
                        wsServerUrl = "http://localhost:8080";
                    }
                    const { data: sessionData } = await supabase.auth.getSession();
                    const token = sessionData?.session?.access_token;
                    
                    const codeRes = await axios.get(`${wsServerUrl}/api/interviews/${interview_id}/code`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    codeSubmission = codeRes.data.code || "";
                    codeLanguage = codeRes.data.language || "javascript";
                } catch (err) {
                    // Non-fatal: the editor flush may time out if the WS server
                    // doesn't ack in time, but we still fetch the last-saved code
                    // from the API below / fall back to conversation-only grading.
                    console.warn("Flush/Fetch code failed (continuing):", err?.message || err);
                    toast.error("Code retrieval failed. AI will grade conversation only.");
                }
            }

            // Canonical completion signal → the WS server clears this interview's
            // realtime state (coding challenge + room status) so a reopened link
            // starts fresh. Only technical interviews have a WS room to clean.
            // Sent here (well before navigation) so it flushes over the socket.
            if (isTechnical) {
                try {
                    wsClient.sendMessage("interview:complete", { interviewId: interview_id, reason });
                } catch (_) { /* best-effort; never block completion */ }
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
                    processing_status: "pending",
                })
                .select();

            if (insertError) {
                // Unique-constraint violation (interview_id, userEmail) → a
                // submission already exists. Treat as success: the interview was
                // already completed (e.g. a race/double-trigger). No error toast.
                const isDuplicate =
                    insertError.code === "23505" ||
                    /duplicate key|unique constraint/i.test(insertError.message || "");
                if (isDuplicate) {
                    console.warn("[INTERVIEW] Duplicate submission prevented:", interview_id);
                    logInterviewEvent("duplicate-submission-prevented", {
                        interviewId: interview_id,
                        candidateEmail: interviewInfo?.userEmail,
                    });
                    router.replace(`/interview/${interview_id}/completed`);
                    return;
                }
                console.error("Database insert error:", insertError);
                toast.error("Failed to initialize feedback record");
                return;
            }

            if (!insertedData || insertedData.length === 0) {
                console.error("Database insert returned no record");
                toast.error("Failed to initialize feedback record");
                return;
            }

            const recordId = insertedData[0].id;
            const conversationData = conversationRef.current;

            // 4. Navigate to the completed page IMMEDIATELY.
            // The AI evaluation can take 20-60s (especially on the free model), and
            // the completed page doesn't depend on it — feedback is reviewed by the
            // recruiter later. So we hand the candidate the completion screen right
            // away instead of making them wait on the interview screen.
            toast.success("Interview saved! Finalizing your feedback in the background...");
            router.replace(`/interview/${interview_id}/completed`);

            // 5. Trigger server-side grading (NOT awaited) — keeps navigation instant.
            // The API route generates the feedback AND persists it to this record on
            // the server, so it completes even if the candidate closes the tab right
            // after navigating away. We only need the request to reach the server.
            axios
                .post("/api/ai-feedback", {
                    conversation: conversationData,
                    codeSubmission,
                    codeLanguage,
                    recordId,
                })
                .catch((aiErr) => {
                    console.error("AI Evaluation request failed:", aiErr?.message || aiErr);
                });
        } catch (err) {
            console.error("Error generating feedback:", err);
            toast.error("Unexpected error occurred.");
        }
    }, [interviewInfo, interview_id, router, isTechnical]);

    const stopInterview = useCallback(() => {
        // Record that this end was candidate-initiated (diagnostics only).
        endedByUserRef.current = true;
        logInterviewEvent("user-end-clicked", { interviewId: interview_id, candidateEmail: interviewInfo?.userEmail });
        try { vapi.stop(); }
        catch (e) { console.warn("vapi.stop failed", e); }
    }, [interview_id, interviewInfo]);

    const startCall = useCallback(() => {
        let questionList = "";
        interviewInfo?.interviewData?.questionList?.forEach(item => {
            questionList += (item?.question ?? "") + ", ";
        });

        // Derive timeouts from the interview's configured duration so the call is
        // never cut off by Vapi's defaults (silence 30s / max 10min).
        const durationSeconds = parseInterviewDurationSeconds(interviewInfo?.interviewData?.duration);
        const silenceTimeoutSeconds = Math.min(durationSeconds, 3600); // Vapi max for silence

        // Coding Challenge Mode tools — only for Technical interviews (which have
        // the editor). The model emits a structured tool-call (NOT keyword text)
        // when it starts/ends a coding round; the frontend reacts to it.
        const codingTools = isTechnical ? [
            {
                type: "function",
                function: {
                    name: "present_coding_challenge",
                    description: "Display a coding challenge in the candidate's UI. Call this at the START of a coding round, before describing the problem aloud.",
                    parameters: {
                        type: "object",
                        properties: {
                            title: { type: "string", description: "Short title, e.g. 'Two Sum'." },
                            description: { type: "string", description: "Full problem statement, including constraints and examples." },
                            difficulty: { type: "string", enum: ["Easy", "Medium", "Hard"] },
                            timeLimit: { type: "number", description: "Time budget in seconds (e.g. 1800 for 30 minutes)." },
                        },
                        required: ["title", "description"],
                    },
                },
            },
            {
                type: "function",
                function: {
                    name: "end_coding_challenge",
                    description: "Call when the coding round is complete and you are moving on to follow-up questions.",
                    parameters: { type: "object", properties: {} },
                },
            },
        ] : undefined;

        const systemPrompt = isTechnical
            ? `
                You are an AI voice assistant conducting a TECHNICAL interview.
                Ask one question at a time and wait for the candidate's response.
                Questions: ${questionList}

                CODING ROUNDS:
                - When you begin a coding question, FIRST call the tool
                  present_coding_challenge with a clear title, a complete problem
                  statement (constraints + an example), a difficulty, and a
                  timeLimit in seconds. THEN read the problem aloud briefly.
                - Let the candidate code. Do not rush them or fill silence; they
                  may be quiet while writing code.
                - When the coding round is finished, call end_coding_challenge,
                  then ask follow-up questions about their solution.
                Keep it friendly.
              `.trim()
            : `
                You are an AI voice assistant conducting interviews.
                Ask one question at a time and wait for the candidate's response.
                Questions: ${questionList}
                Keep it friendly.
              `.trim();

        const assistantOptions = {
            name: "AI Recruiter",
            firstMessage: `Hi ${interviewInfo?.userName}, how are you? Ready for your interview on ${interviewInfo?.interviewData?.jobPosition}?`,
            // ✅ Honor the configured length; ✅ don't end while the candidate codes/thinks.
            maxDurationSeconds: durationSeconds,
            silenceTimeoutSeconds,
            // Correlation for the backend Vapi webhook
            metadata: {
                interview_id,
                userEmail: interviewInfo?.userEmail,
                userName: interviewInfo?.userName,
                type: interviewInfo?.interviewData?.type || "",
            },
            ...(process.env.NEXT_PUBLIC_VAPI_SERVER_URL
                ? { server: { url: process.env.NEXT_PUBLIC_VAPI_SERVER_URL }, serverMessages: ["end-of-call-report"] }
                : (process.env.NODE_ENV === "production" ? (() => { throw new Error("NEXT_PUBLIC_VAPI_SERVER_URL is required in production"); })() : {})),
            model: {
                provider: "google",
                model: "gemini-2.0-flash",
                ...(codingTools ? { tools: codingTools } : {}),
                messages: [
                    {
                        role: "system",
                        content: systemPrompt,
                    }
                ]
            }
        };

        logInterviewEvent("call-config", {
            interviewId: interview_id,
            candidateEmail: interviewInfo?.userEmail,
            duration: interviewInfo?.interviewData?.duration,
            maxDurationSeconds: durationSeconds,
            silenceTimeoutSeconds,
        });

        if (!vapi || !process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY) {
            setVapiError("Voice Agent configuration missing or invalid. Cannot start interview.");
            return;
        }

        try {
            vapi.start(assistantOptions).catch(err => {
                console.error("Vapi start rejected:", err);
                if (err?.name === "NotAllowedError") {
                    setVapiError("Microphone permission denied. Please allow microphone access in your browser settings and refresh the page.");
                } else {
                    setVapiError("Failed to access microphone or connect to voice agent. Please check your network and hardware.");
                }
            });
        } catch (err) {
            console.error("Vapi start threw:", err);
            setVapiError("Failed to start voice agent due to an unexpected hardware or software error.");
        }
    }, [interviewInfo, interview_id]);

    useEffect(() => {
        vapi.on("message", (message) => {
            if (message.type === "status-update") {
                if (message.status === "ended") {
                    const reason = message.endedReason || "unknown";
                    lastEndedReasonRef.current = reason;
                }
            } // Coding Challenge Mode — structured tool-call (no keyword matching).
            const tool = extractToolCall(message);
            if (tool?.name === "present_coding_challenge") {
                const challenge = {
                    title: tool.args.title || "Coding Challenge",
                    description: tool.args.description || "",
                    difficulty: tool.args.difficulty || "Medium",
                    timeLimit: Number(tool.args.timeLimit) || 1800,
                };
                useCodingStore.getState().presentChallenge(challenge); // optimistic UI
                try { wsClient.sendMessage("coding:present", { challenge }); } catch (_) {}
                logInterviewEvent("coding-present", {
                    interviewId: interview_id,
                    title: challenge.title,
                    difficulty: challenge.difficulty,
                    timeLimit: challenge.timeLimit,
                });
            } else if (tool?.name === "end_coding_challenge") {
                useCodingStore.getState().endCoding();
                try { wsClient.sendMessage("coding:end", {}); } catch (_) {}
                logInterviewEvent("coding-end", { interviewId: interview_id });
            }

            if (message?.conversation) {
                setConversation(message.conversation);
            }
        });

        const handleCallStart = () => {
            logInterviewEvent("call-start", {
                interviewId: interview_id,
                candidateEmail: interviewInfo?.userEmail,
            });
            toast("Call Connected...");
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTime(prev => { const next = prev + 1; timeRef.current = next; return next; });
            }, 1000);
        };

        const handleCallEnd = () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            const reason = lastEndedReasonRef.current || "(unknown)";
            const userEnded = endedByUserRef.current;

            // Map the Vapi end into a canonical completion reason for cleanup.
            let completionReason = "ai_completed";
            if (userEnded) completionReason = "candidate_end";
            else if (/max-duration|maximum-duration/i.test(reason)) completionReason = "duration_expired";

            // Diagnostics before finalizing — enables future debugging of premature
            // ends (silence vs. duration vs. error vs. network). No recovery logic.
            logInterviewEvent("call-end", {
                interviewId: interview_id,
                candidateEmail: interviewInfo?.userEmail,
                endedReason: reason,
                userEnded,
                completionReason,
                elapsedSec: timeRef.current,
            });

            toast("Interview Ended... Generating feedback.");
            GenerateFeedback(completionReason);
        };

        const handleSpeechStart = () => {
            logInterviewEvent("speech-start", { interviewId: interview_id, candidateEmail: interviewInfo?.userEmail });
            setActiveUser(false);
        };
        const handleSpeechEnd = () => {
            logInterviewEvent("speech-end", { interviewId: interview_id, candidateEmail: interviewInfo?.userEmail });
            setActiveUser(true);
        };
        const handleError = (error) => {
            // Vapi surfaces normal call termination (hang-up / "meeting ended" /
            // ejection) as an `error` event, often with an empty `{}` payload or a
            // payload whose fields are themselves objects. Extract a readable string
            // and coerce it — never let a non-string slip through.
            const candidate =
                (typeof error === "string" && error) ||
                error?.errorMsg ||
                error?.error?.message ||
                error?.error?.msg ||
                error?.message ||
                error?.reason ||
                "";
            const msg = typeof candidate === "string" ? candidate : "";

            // Does the event carry any meaningful content? An empty/contentless
            // payload means Vapi is just signalling normal call termination.
            let hasContent = !!msg;
            if (!hasContent && error && typeof error === "object") {
                try { hasContent = JSON.stringify(error) !== "{}"; } catch { /* circular -> assume content */ hasContent = true; }
            }

            // Benign end-of-call signals: log quietly and bail. call-end handles
            // feedback generation separately, so there's nothing for the user to do.
            const benign =
                !hasContent ||
                /meeting (has )?ended|ejection|ended due to|call (has )?ended|customer-ended-call|assistant-ended-call/i.test(msg);
            if (benign) {
                logInterviewEvent("vapi-error-benign", { interviewId: interview_id, candidateEmail: interviewInfo?.userEmail, msg: msg || "(empty)" });
                console.info("[VAPI] Call ended:", msg || "(normal termination)");
                return;
            }

            // Log only. We do NOT terminate or recover here; Vapi fires `error`
            // then `call-end`, and call-end handles finalization.
            logInterviewEvent("vapi-error", { interviewId: interview_id, candidateEmail: interviewInfo?.userEmail, msg, online: typeof navigator !== "undefined" ? navigator.onLine : null });
            console.error("VAPI ERROR:", msg, error);
            toast.error("Voice connection error. Please try again.");
        };

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
    }, [GenerateFeedback, interviewInfo, interview_id]);

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

    if (vapiError) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Phone className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Connection Failed</h2>
                    <p className="text-slate-600 mb-6">{vapiError}</p>
                    <button onClick={() => window.location.reload()} className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">
                        Retry Connection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8 lg:px-12 xl:px-20 flex flex-col">
            {/* Coding Challenge modal (Technical interviews only) */}
            {isTechnical && <CodingChallengeModal />}

            {/* Unified Header */}
            <header className="flex items-center justify-between gap-3 mb-6 px-3 sm:px-4 py-2.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm shadow-slate-200/50">
                {/* Brand + session context */}
                <div className="flex items-center gap-3 min-w-0">
                    <Link href="/" className="shrink-0 hover:opacity-80 transition-opacity">
                        <Logo size="sm" />
                    </Link>
                    <span className="hidden sm:block h-8 w-px bg-slate-200" />
                    <div className="min-w-0 hidden sm:block">
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-semibold text-slate-800 truncate max-w-[200px] md:max-w-none">
                                {interviewInfo?.interviewData?.jobPosition || "AI Interview Session"}
                            </h1>
                            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-50 text-indigo-600">
                                {isTechnical ? "Technical" : "Behavioral"}
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">AI Interview Session</p>
                    </div>
                </div>

                {/* Right cluster: mobile tabs + live status + timer */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {isTechnical && (
                        <div className="flex lg:hidden bg-slate-100/80 p-1 rounded-xl">
                            <button
                                onClick={() => setMobileTab("interview")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mobileTab === 'interview' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <MessageSquare className="h-4 w-4" />
                                <span className="hidden sm:inline">Voice</span>
                            </button>
                            <button
                                onClick={() => setMobileTab("code")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mobileTab === 'code' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Code2 className="h-4 w-4" />
                                <span className="hidden sm:inline">Code</span>
                            </button>
                        </div>
                    )}

                    {codingActive && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 animate-in fade-in duration-300">
                            <Code2 className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold tracking-wide">CODING</span>
                        </div>
                    )}

                    <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-100">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                        <span className="text-xs font-semibold text-red-600 tracking-wide">REC</span>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-sm">
                        <Timer className="h-4 w-4 text-indigo-300" />
                        <span className="font-mono text-base font-semibold tabular-nums">{formatTime(time)}</span>
                    </div>
                </div>
            </header>

            {/* Layout Grid */}
            <div className={`flex-1 ${isTechnical ? 'lg:grid lg:grid-cols-12 lg:gap-8' : 'max-w-4xl mx-auto w-full'}`}>
                
                {/* Voice Column */}
                <div className={`${isTechnical ? 'lg:col-span-4' : ''} ${isTechnical && mobileTab === 'code' ? 'hidden lg:block' : 'block'} h-full`}>
                    <div className="flex flex-col h-full">
                        <div className={`grid grid-cols-1 ${isTechnical ? '' : 'md:grid-cols-2'} gap-5 mb-6 flex-1`}>
                            {/* AI Recruiter */}
                            <div className={`group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60 shadow-xl shadow-indigo-100/40 p-6 flex flex-col items-center justify-center transition-all hover:shadow-2xl hover:shadow-indigo-100/50 hover:border-indigo-100 ${isTechnical ? 'min-h-[230px]' : 'min-h-[340px]'}`}>
                                <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-indigo-200/40 to-blue-200/40 rounded-full blur-3xl" />
                                <div className={`absolute top-3 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${!activeUser ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${!activeUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    {!activeUser ? 'Speaking' : 'Listening'}
                                </div>
                                <div className="relative mb-5 mt-2">
                                    {!activeUser && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 opacity-75 animate-ping" />}
                                    {!activeUser && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 opacity-30 animate-pulse scale-110" />}
                                    <div className="relative p-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 shadow-lg shadow-indigo-500/30">
                                        <Image src="/Interviewer.png" alt="AI Recruiter" width={100} height={100} className="w-20 h-20 rounded-full object-cover border-4 border-white" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-0.5">AI Recruiter</h3>
                                <p className="text-sm text-slate-500">Conducting your interview</p>
                            </div>

                            {/* Candidate */}
                            <div className={`group relative overflow-hidden bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60 shadow-xl shadow-indigo-100/40 p-6 flex flex-col items-center justify-center transition-all hover:shadow-2xl hover:shadow-indigo-100/50 hover:border-blue-100 ${isTechnical ? 'min-h-[230px]' : 'min-h-[340px]'}`}>
                                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-blue-200/40 to-teal-200/40 rounded-full blur-3xl" />
                                <div className={`absolute top-3 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${activeUser ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${activeUser ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                    {activeUser ? 'Speaking' : 'Listening'}
                                </div>
                                <div className="relative mb-5 mt-2">
                                    {activeUser && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 opacity-75 animate-ping" />}
                                    {activeUser && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-teal-500 opacity-30 animate-pulse scale-110" />}
                                    <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 text-white text-2xl font-bold shadow-lg shadow-blue-500/30 border-4 border-white">
                                        {interviewInfo?.userName?.[0]?.toUpperCase() || "?"}
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-800 mb-0.5">{interviewInfo?.userName || "Candidate"}</h3>
                                <p className="text-sm text-slate-500">Interview Candidate</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center mt-auto">
                            <div className="flex items-center justify-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/50 border border-white/60">
                                <button title="Microphone" className="group relative p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all hover:scale-105 active:scale-95">
                                    <Mic className="h-5 w-5" />
                                </button>
                                <AlertConfirmation stopInterview={stopInterview}>
                                    <button title="End interview" className="group relative p-4 bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-full shadow-lg shadow-red-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-red-500/40 active:scale-95">
                                        <Phone className="h-5 w-5" />
                                    </button>
                                </AlertConfirmation>
                            </div>
                            <div className="mt-5 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50/70 border border-emerald-100">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-xs font-medium text-emerald-700">Interview in Progress</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Editor Column */}
                {isTechnical && (
                    <div className={`lg:col-span-8 ${mobileTab === 'interview' ? 'hidden lg:block' : 'block'} h-full`}>
                        <WebSocketProvider interviewId={interview_id}>
                            <div className="flex flex-col h-[700px] lg:h-[800px] w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 overflow-hidden">
                                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg shadow-md shadow-indigo-500/25">
                                            <Code2 className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="font-semibold text-slate-800">Code Editor</span>
                                    </div>
                                    <div className="flex items-center gap-3">
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
