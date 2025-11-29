import axios from "axios";
import { Loader2, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react"; // <--- useState lives here
import { toast } from "sonner";
import QuestionListContainer from "./QuestionListContainer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/services/supabaseClient";
import { v4 as uuidv4 } from 'uuid';
import { useUser } from "@/app/provider";

function QuestionList({ formData,onCreateLink }) {
    // 👇 YOUR STATE LOGIC IS HERE
    const [loading, setLoading] = useState(true);
    const [questionList, setQuestionList] = useState([]);
    const {user} = useUser();
    const [saveLoading,setSaveLoading] = useState(false);

    useEffect(() => {
        if (formData) {
            GenerateQuestionList();
        }
    }, [formData]);

    const GenerateQuestionList = async () => {
        setLoading(true);
        try {
            const result = await axios.post("/api/ai-model", {
                ...formData,
            });
            
            console.log("AI Response:", result.data);
            
            // The API returns the clean object, so we just set it
            setQuestionList(result.data.interviewQuestions || []);
            setLoading(false);
        }
        catch (error) {
            console.error(error);
            toast('Server Error try again !')
            setLoading(false);
        }
    }



    const onFinish = async () => {
        
        if (!user?.email) {
             toast("Please log in to save your interview.");
             return;
        }
        setSaveLoading(true);

        const interview_id = uuidv4();
        
        // Fix: Extract string from Array if necessary (as discussed before)
        const cleanType = Array.isArray(formData?.interviewType) 
            ? formData?.interviewType[0] 
            : formData?.interviewType;

        const { data, error } = await supabase
            .from('Interviews')
            .insert([
                { 
                    // MAP JAVASCRIPT KEYS TO EXACT DATABASE COLUMNS
                    jobPosition: formData?.jobPosition,
                    jobDescription: formData?.jobDescription,
                    
                    duration: formData?.interviewDuration, // Fix: Map interviewDuration -> duration
                    type: cleanType,                       // Fix: Map interviewType -> type
                    questionList: questionList,
                    userEmail: user?.email,
                    interview_id: interview_id             // Fix: Map interviewId -> interview_id
                },
            ])
            .select();

        if (data) {
            console.log("Saved:", data);
            toast("Interview saved successfully!");
        }
        if (error) {
            console.error("Supabase Error:", error);
            toast("Failed to save: " + error.message);
        }
        setSaveLoading(false);
        onCreateLink(interview_id);
    }

    return (
        <div>
            {/* Loading State */}
            {loading && (
                <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 flex gap-5 items-center my-4">
                    <Loader2Icon className="animate-spin text-blue-600" />
                    <div>
                        <h2 className="font-medium text-lg">Generating Interview Questions</h2>
                        <p className="text-gray-500 text-sm">Our AI is crafting personalized questions based on your job description...</p>
                    </div>
                </div>
            )}

            {/* List of Questions */}
            {!loading && questionList.length > 0 && (
                <div className="mt-8">
                    <QuestionListContainer questionList={questionList}/>
                </div>
            )}

            <div className="flex justify-end mt-8">
                <Button onClick={()=>onFinish()} disabled={saveLoading}>
                    {saveLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Interview Link & Finish</Button>
            </div>
        </div>
    )
}

export default QuestionList