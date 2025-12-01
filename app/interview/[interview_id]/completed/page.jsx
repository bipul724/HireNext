import { Button } from "@/components/ui/button";
import { Check, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function InterviewCompleted() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
      
      {/* 1. Success Checkmark */}
      <div className="mb-6">
        <div className="bg-green-500 rounded-full p-4 inline-block shadow-lg ">
          <Check className="h-10 w-10 text-white" strokeWidth={4} />
        </div>
      </div>

      {/* 2. Main Title */}
      <h1 className="text-4xl font-bold text-gray-900 mb-2">
        Interview Complete!
      </h1>
      <p className="text-gray-500 text-lg mb-5">
        Thank you for participating in the AI-driven interview with AIcruiter
      </p>

      {/* 3. Hero Illustration - Natural Height Version */}
      <div className="w-full max-w-3xl mb-5 rounded-3xl overflow-hidden shadow-sm">
        <Image
          src="/interview-complete.png"
          alt="Interview Complete Illustration"
          width={1000}
          height={500}
          className="w-full h-auto" // This makes it responsive without cutting
        />
      </div>

      {/* 4. What's Next Section */}
      <div className="flex flex-col items-center gap-4 max-w-lg">
        <div className="bg-blue-600 rounded-full p-3 shadow-md">
          <Send className="h-6 w-6 text-white" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900">What's Next?</h2>
        
        <p className="text-gray-500 leading-relaxed">
          The recruiter will review your interview responses and will contact you
          soon regarding the next steps.
        </p>

        {/* Optional: Home Button */}
        <Link href="/dashboard" className="mt-1">
            <Button className="w-full">Go to Dashboard</Button>
        </Link>
      </div>

    </div>
  );
}

export default InterviewCompleted;