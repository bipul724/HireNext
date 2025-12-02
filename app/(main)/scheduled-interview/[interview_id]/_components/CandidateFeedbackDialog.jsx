import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

function CandidateFeedbackDialog({ candidate }) {
    const feedback = candidate?.feedback?.feedback;

    // 1. Calculate Average Rating
    const CalculateRating = () => {
        if (!feedback?.rating) return 0;
        const total = (feedback.rating.technicalSkills || 0) + 
                      (feedback.rating.communication || 0) + 
                      (feedback.rating.problemSolving || 0) + 
                      (feedback.rating.experience || 0);
        return Math.round(total / 4);
    }

    const avgRating = CalculateRating();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={"outline"} className="text-primary border-primary">View Report</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Interview Feedback</DialogTitle>
                    <DialogDescription asChild>
                        <div className="mt-5">
                            
                            {/* Header Section */}
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
                                <div className="flex gap-5 items-center">
                                    {/* 2. Fixed Avatar Styling & Safety */}
                                    <h2 className="bg-primary w-12 h-12 flex items-center justify-center text-white font-bold rounded-full text-xl">
                                        {candidate?.userEmail?.[0]?.toUpperCase()}
                                    </h2>
                                    <div>
                                        <h2 className="font-bold text-lg text-black">{candidate?.userName}</h2>
                                        <h2 className="text-sm text-gray-500">{candidate?.userEmail}</h2>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    {/* 3. Display Calculated Rating */}
                                    <h2 className="text-primary text-3xl font-bold">{avgRating}/10</h2>
                                    <span className="text-xs text-gray-500">Overall Score</span>
                                </div>
                            </div>

                            {/* Skills Section */}
                            <div className="mt-5">
                                <h2 className="font-bold text-lg text-gray-800">Skills Assessment</h2>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-5 border p-4 rounded-lg">
                                    {/* Added safety checks (|| 0) to prevent NaN errors */}
                                    <div>
                                        <h2 className="flex justify-between text-sm">Technical Skills 
                                            <span className="font-bold">{feedback?.rating?.technicalSkills}/10</span>
                                        </h2>
                                        <Progress value={(feedback?.rating?.technicalSkills || 0) * 10} className="mt-1 h-2" />
                                    </div>
                                    <div>
                                        <h2 className="flex justify-between text-sm">Communication
                                            <span className="font-bold">{feedback?.rating?.communication}/10</span>
                                        </h2>
                                        <Progress value={(feedback?.rating?.communication || 0) * 10} className="mt-1 h-2" />
                                    </div>
                                    <div>
                                        <h2 className="flex justify-between text-sm">Problem Solving 
                                            <span className="font-bold">{feedback?.rating?.problemSolving}/10</span>
                                        </h2>
                                        <Progress value={(feedback?.rating?.problemSolving || 0) * 10} className="mt-1 h-2" />
                                    </div>
                                    <div>
                                        <h2 className="flex justify-between text-sm">Experience 
                                            <span className="font-bold">{feedback?.rating?.experience}/10</span>
                                        </h2>
                                        <Progress value={(feedback?.rating?.experience || 0) * 10} className="mt-1 h-2" />
                                    </div>
                                </div>
                            </div>

                            {/* Summary Section */}
                            <div className="mt-5">
                                <h2 className="font-bold text-lg text-gray-800">Performance Summary</h2>
                                <div className="mt-5 bg-gray-100 border border-gray-200 rounded-lg p-4">
                                    <p className="text-sm text-gray-600 mt-2 leading-6">
                                        {feedback?.summery}
                                    </p>
                                </div>
                            </div>

                            {/* Recommendation Section */}
                            {/* Check if recommendation exists first to avoid empty box */}
                            {feedback?.Recommendation && (
                                <div className={`mt-5 p-5 flex items-center justify-between rounded-md 
                                    ${feedback.Recommendation.toLowerCase().includes("not") ? "bg-red-50 border border-red-100" : "bg-green-50 border border-green-100"}`}
                                >
                                    <div className="flex-1 mr-4">
                                        <h2 className={`font-bold ${feedback.Recommendation.toLowerCase().includes("not") ? "text-red-700" : "text-green-700"}`}>
                                            Recommendation: {feedback.Recommendation}
                                        </h2>
                                        <p className={`text-sm mt-1 ${feedback.Recommendation.toLowerCase().includes("not") ? "text-red-600" : "text-green-600"}`}>
                                            {feedback?.RecommendationMsg}
                                        </p>
                                    </div>
                                    <Button className={`text-white shadow-sm 
                                        ${feedback.Recommendation.toLowerCase().includes("not") ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
                                    >
                                        Notify Candidate
                                    </Button>
                                </div>
                            )}

                        </div>
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}

export default CandidateFeedbackDialog;