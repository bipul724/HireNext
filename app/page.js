"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Bot, 
  BrainCircuit, 
  Sparkles, 
  Mic, 
  FileText, 
  Menu, 
  X, 
  ArrowRight,
  Play,
  CheckCircle2
} from 'lucide-react';

// --- Real Component Imports ---
import { SplineScene } from "@/components/ui/splite"; 
import { Spotlight } from "@/components/ui/spotlight";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500 selection:text-white overflow-x-hidden font-sans">
      
      {/* --- Navigation --- */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-lg shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">HireNext</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden items-center gap-8 md:flex">
            <Link href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">How it Works</Link>
            <Link href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</Link>
            
            {/* Added Dashboard Link Here */}
            <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Dashboard</Link>
            
            <Link 
              href="/auth" 
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 hover:scale-105 active:scale-95"
            >
              Get Started
            </Link>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-slate-300 hover:text-white" 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
        
        {/* Mobile Nav Dropdown */}
        {isMobileMenuOpen && (
          <div className="border-t border-slate-800 bg-slate-950 px-6 py-4 md:hidden animate-in slide-in-from-top-5">
            <div className="flex flex-col gap-4">
              <Link href="#features" className="text-sm text-slate-400 hover:text-white">Features</Link>
              <Link href="#how-it-works" className="text-sm text-slate-400 hover:text-white">How it Works</Link>
              {/* Added Dashboard Link for Mobile */}
              <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">Dashboard</Link>
              <Link href="/auth" className="block w-full rounded-md bg-indigo-600 py-2 text-center text-sm font-semibold hover:bg-indigo-500">Get Started</Link>
            </div>
          </div>
        )}
      </nav>

      {/* --- Hero Section --- */}
      <section className="relative w-full overflow-hidden bg-slate-950 pt-16 pb-20 md:pt-24 lg:pt-32">
        {/* Spotlight Effect */}
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="white"
        />
        <div className="mx-auto flex h-full max-w-7xl flex-col md:flex-row gap-12 px-6">
          
          {/* Left Content: Text & CTA */}
          <div className="flex flex-1 flex-col justify-center z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium w-fit mb-6">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              New: Vapi AI Voice Agents Integration
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl leading-tight">
              Your AI-Powered <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-teal-400">Hiring Assistant.</span>
            </h1>
            
            <p className="mt-6 max-w-lg text-lg text-slate-400 leading-relaxed">
              Automate your screening process. Our AI agents conduct natural voice interviews, generate questions, and provide instant candidate feedback.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link 
                href="/dashboard" 
                className="flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-8 py-4 text-sm font-bold text-white transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/20"
              >
                Create New Interview
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link 
                href="#demo" 
                className="flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-8 py-4 text-sm font-bold text-white transition hover:bg-slate-800 hover:border-slate-600"
              >
                <Play className="h-4 w-4 fill-white" />
                Watch Demo
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-4 text-sm text-slate-500">
               <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-8 w-8 rounded-full border-2 border-slate-950 bg-slate-800"></div>
                  ))}
               </div>
               <p>Trusted by 100+ recruiters</p>
            </div>
          </div>

          {/* Right Content: 3D Scene / Visual */}
          <div className="flex-1 relative w-full min-h-[400px] md:h-auto lg:min-h-[600px]">
            <SplineScene 
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
            
            {/* Floating Cards (Decorative) */}
            <div className="absolute -bottom-6 -left-6 bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-xl shadow-xl hidden lg:block animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="text-green-500 h-6 w-6" />
                </div>
                <div>
                  <p className="text-white font-semibold">Interview Completed</p>
                  <p className="text-slate-400 text-xs">Score: 92/100</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Features Grid --- */}
      <section id="features" className="bg-slate-900/50 py-24 relative z-10 border-t border-slate-800/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white md:text-5xl">More than just a form</h2>
            <p className="mt-4 text-slate-400 text-lg">A complete ecosystem for automated hiring. From question generation to detailed feedback.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <Card className="border-slate-800 bg-slate-950 p-8 hover:border-indigo-500/50 transition duration-300 hover:-translate-y-1 group">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-900/20 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BrainCircuit className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">AI Question Generation</h3>
              <p className="text-slate-400 leading-relaxed">
                Provide a job role and tech stack, and our AI instantly generates tailored, relevant interview questions to assess candidate depth.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card className="border-slate-800 bg-slate-950 p-8 hover:border-teal-500/50 transition duration-300 hover:-translate-y-1 group">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-teal-900/20 text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Mic className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Voice Agent Interviews</h3>
              <p className="text-slate-400 leading-relaxed">
                Candidates speak naturally with our Vapi-powered AI agents. It feels like a real conversation, available 24/7.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card className="border-slate-800 bg-slate-950 p-8 hover:border-purple-500/50 transition duration-300 hover:-translate-y-1 group">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-purple-900/20 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <FileText className="h-7 w-7" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Instant Feedback</h3>
              <p className="text-slate-400 leading-relaxed">
                Get a comprehensive report immediately after the call. Includes transcripts, strength analysis, and an overall rating.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* --- How it Works --- */}
      <section id="how-it-works" className="py-24 bg-slate-950">
        <div className="mx-auto max-w-7xl px-6">
            <div className="grid items-center gap-16 lg:grid-cols-2">
                
                {/* Steps List */}
                <div>
                    <h2 className="mb-8 text-3xl font-bold text-white md:text-4xl">Streamline your hiring <br/><span className="text-indigo-500">in 3 simple steps.</span></h2>
                    <div className="space-y-10">
                        {/* Step 1 */}
                        <div className="flex gap-6 group">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-lg font-bold text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-400 transition-colors">1</div>
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2">Create & Generate</h3>
                                <p className="text-slate-400">Create a new interview in the dashboard. Use our AI to generate role-specific questions for the agent to ask.</p>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex gap-6 group">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-lg font-bold text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-400 transition-colors">2</div>
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2">Share Link</h3>
                                <p className="text-slate-400">Send the unique interview link to candidates. They can join from the browser without installing any software.</p>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex gap-6 group">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-lg font-bold text-slate-400 group-hover:border-indigo-500 group-hover:text-indigo-400 transition-colors">3</div>
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-2">Review Feedback</h3>
                                <p className="text-slate-400">Review the audio recording, read the transcript, and analyze the AI-generated rating to make your decision.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visual Representation (Mock Interface) */}
                <div className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6 md:p-10 shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                      <Bot className="w-64 h-64 text-indigo-500" />
                    </div>
                    
                    {/* Chat Bubble Interface */}
                    <div className="space-y-6 relative z-10">
                        {/* AI Message */}
                        <div className="flex gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-500/20">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div className="max-w-[85%]">
                                <div className="rounded-2xl rounded-tl-none bg-slate-800 border border-slate-700 p-4 text-sm text-slate-200 shadow-sm">
                                    <p>Can you explain the difference between `useEffect` and `useLayoutEffect` in React?</p>
                                </div>
                                <span className="text-xs text-slate-500 mt-1 ml-1">AI Interviewer • 10:02 AM</span>
                            </div>
                        </div>

                        {/* Candidate Message (Voice Viz) */}
                        <div className="flex flex-row-reverse gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 shadow-lg shadow-teal-500/20">
                                <span className="font-bold text-white text-xs">JS</span>
                            </div>
                            <div className="max-w-[85%]">
                                <div className="rounded-2xl rounded-tr-none bg-indigo-600 p-4 text-sm text-white shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                       <div className="flex items-end gap-0.5 h-4">
                                          <div className="w-1 bg-white/70 h-2 animate-pulse"></div>
                                          <div className="w-1 bg-white/70 h-4 animate-pulse delay-75"></div>
                                          <div className="w-1 bg-white/70 h-3 animate-pulse delay-150"></div>
                                          <div className="w-1 bg-white/70 h-5 animate-pulse delay-100"></div>
                                          <div className="w-1 bg-white/70 h-2 animate-pulse"></div>
                                       </div>
                                       <span className="text-xs text-indigo-200">Recording...</span>
                                    </div>
                                    <p>Sure! The main difference is timing. `useEffect` runs asynchronously after the render is painted to the screen, whereas `useLayoutEffect` runs synchronously after DOM mutations but before the paint...</p>
                                </div>
                                <span className="text-xs text-slate-500 mt-1 mr-1 text-right block">Candidate • 10:03 AM</span>
                            </div>
                        </div>

                        {/* Feedback Badge (Overlay) */}
                        <div className="absolute -bottom-8 -right-4 md:right-8 bg-slate-900 border border-teal-500/30 rounded-xl p-4 shadow-xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 delay-1000 duration-700">
                           <div className="bg-teal-500/20 p-2 rounded-lg">
                              <Sparkles className="w-5 h-5 text-teal-400" />
                           </div>
                           <div>
                              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Answer Quality</p>
                              <p className="text-white font-bold text-lg">9/10 <span className="text-xs font-normal text-slate-400 ml-1">Excellent technical depth</span></p>
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- CTA Section --- */}
      <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="mx-auto max-w-4xl px-6 text-center">
            <h2 className="text-3xl font-bold text-white md:text-5xl tracking-tight">Ready to transform your <br/> hiring process?</h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-400">Join thousands of companies using AI Voice Agents to screen candidates faster and fairer.</p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                 <Link 
                  href="/auth" 
                  className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-base font-bold text-slate-950 transition hover:bg-slate-200 hover:scale-105"
                >
                  Get Started for Free
                </Link>
                <Link 
                  href="#contact" 
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-transparent px-8 py-4 text-base font-bold text-white transition hover:bg-slate-800"
                >
                  Contact Sales
                </Link>
            </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                <span className="font-semibold text-white">HireNext</span>
            </div>
            <p className="text-sm text-slate-500">© 2024 HireNext Inc. All rights reserved.</p>
            <div className="flex gap-6">
                <a href="#" className="text-slate-500 hover:text-white transition-colors">Twitter</a>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">GitHub</a>
                <a href="#" className="text-slate-500 hover:text-white transition-colors">LinkedIn</a>
            </div>
        </div>
      </footer>
    </div>
  );
}