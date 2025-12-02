import { Button } from "@/components/ui/button";
import moment from "moment";
import CandidateFeedbackDialog from "./CandidateFeedbackDialog";

function CandidateList({ candidateList }) {

    // 1. Helper function to calculate average rating
    const GetAverageRating = (feedback) => {
        if (!feedback?.rating) return 0;
        
        const rating = feedback.rating;
        const total = (rating.technicalSkills || 0) + 
                      (rating.communication || 0) + 
                      (rating.problemSolving || 0) + 
                      (rating.experience || 0);
        
        return Math.round(total / 4);
    }

    return (
        <div className="p-5">
            <h2 className="font-bold my-5">Candidates ({candidateList?.length || 0})</h2>
            
            <div className="grid grid-cols-1 gap-5">
                {candidateList?.map((candidate, index) => {
                    // Calculate rating for this specific candidate
                    const avgRating = GetAverageRating(candidate?.feedback?.feedback);
                    
                    return (
                        <div key={index} className="p-5 flex gap-3 items-center justify-between bg-white border shadow-sm rounded-lg">
                            <div className="flex gap-5 items-center">
                                {/* 2. Fixed styling & Safe access for Avatar */}
                                <h2 className="bg-primary w-12 h-12 flex items-center justify-center text-white font-bold rounded-full text-lg">
                                    {candidate?.userEmail?.[0]?.toUpperCase()}
                                </h2>
                                <div>
                                    <h2 className="font-bold text-lg">{candidate?.userName}</h2>
                                    <h2 className="text-sm text-gray-500">
                                        Completed On: {moment(candidate?.created_at).format("DD MMM YYYY")}
                                    </h2>
                                </div>
                            </div>
                            <div className="flex gap-3 items-center">
                                {/* 3. Display Calculated Rating */}
                                <h2 className="text-lg font-bold text-green-700">{avgRating}/10</h2>
                                
                                <CandidateFeedbackDialog candidate={candidate} />
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default CandidateList;