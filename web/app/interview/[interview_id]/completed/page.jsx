import { Button } from "@/components/ui/button";
import { Check, Send, ArrowRight, Sparkles, Clock, MessageSquare, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function InterviewCompleted() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/50 flex flex-col items-center justify-center p-6 md:p-10">

      {/* Main Card */}
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl shadow-emerald-100/50 border border-white/50 overflow-hidden">

        {/* Success Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-10 text-center relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />

          {/* Success Icon */}
          <div className="relative inline-flex mb-4">
            <div className="absolute inset-0 bg-white/30 rounded-full animate-ping" />
            <div className="relative bg-white rounded-full p-4 shadow-lg shadow-emerald-600/30">
              <Check className="h-10 w-10 text-emerald-600" strokeWidth={3} />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Interview Complete!
          </h1>
          <p className="text-emerald-100 text-base md:text-lg max-w-md mx-auto">
            Thank you for participating in the AI-driven interview with HireNext
          </p>
        </div>

        {/* Content Section */}
        <div className="p-8">
          {/* Illustration */}
          <div className="relative -mt-16 mb-8">
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 overflow-hidden mx-auto max-w-md">
              <Image
                src="/interview-complete.png"
                alt="Interview Complete Illustration"
                width={500}
                height={300}
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Stats/Info Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 text-center border border-blue-100">
              <Clock className="h-5 w-5 text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Duration</p>
              <p className="text-lg font-bold text-slate-800">Completed</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 text-center border border-purple-100">
              <MessageSquare className="h-5 w-5 text-purple-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Responses</p>
              <p className="text-lg font-bold text-slate-800">Recorded</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 text-center border border-amber-100">
              <Star className="h-5 w-5 text-amber-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Status</p>
              <p className="text-lg font-bold text-slate-800">Under Review</p>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">What's Next?</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  The recruiter will review your interview responses and will contact you
                  soon regarding the next steps. You'll receive an email notification once the review is complete.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Link href="/dashboard" className="block">
            <Button className="w-full h-14 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-base shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 group">
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>

          {/* Footer note */}
          <p className="text-center text-xs text-slate-400 mt-6">
            Questions? Contact support@hirenext.com
          </p>
        </div>

      </div>

      {/* Floating decorative elements */}
      <div className="fixed top-20 left-10 w-20 h-20 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-2xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-2xl pointer-events-none" />

    </div>
  );
}

export default InterviewCompleted;