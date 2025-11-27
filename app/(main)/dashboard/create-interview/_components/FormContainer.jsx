import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { InterviewType } from "@/services/Constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";


function FormContainer({ onHandleInputChange }){
    const [interviewType,setInterviewType] = useState([]);

    useEffect(()=>{
        // Pass the data to parent component
        onHandleInputChange("interviewType", interviewType);
    },[interviewType]);

    // ✅ NEW: Handler for Toggling Logic
    const handleTypeChange = (typeName) => {
        setInterviewType(prev => {
            if(prev.includes(typeName)){
                // If already selected, remove it (filter out)
                return prev.filter(item => item !== typeName);
            } else {
                // If not selected, add it
                return [...prev, typeName];
            }
        })
    }





    

    return (
        <div className="p-5 bg-white rounded-xl">
            <div>
                <h2 className="text-sm font-medium">Job Position</h2>
                <Input
                placeholder="Enter job position"
                className="mt-2"
                onChange={(e) => onHandleInputChange("jobPosition", e.target.value)}                
                />
            </div>
            <div className="mt-5">
                <h2 className="text-sm font-medium">Job Description</h2>
                <Textarea
                placeholder="Enter job description"
                className="h-[200px] mt-2"                
                onChange={(e) => onHandleInputChange("jobDescription", e.target.value)}
                />
            </div>
            <div className="mt-5">
                <h2 className="text-sm font-medium">Interview Duration</h2>
                <Select onValueChange={(value) => onHandleInputChange("interviewDuration", value)}>
                    <SelectTrigger className="w-full mt-2">
                        <SelectValue placeholder="Select Duration" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="5 minutes">5 Minutes</SelectItem>
                        <SelectItem value="15 minutes">15 Minutes</SelectItem>
                        <SelectItem value="30 minutes">30 Minutes</SelectItem>
                        <SelectItem value="45 minutes">45 Minutes</SelectItem>
                        <SelectItem value="60 minutes">60 Minutes</SelectItem>
                    </SelectContent>
                </Select>
            </div>  
            <div className="mt-5">
                <h2 className="text-sm font-medium">Interview Type</h2>
                <div className="flex gap-3 flex-wrap mt-2">
                    {InterviewType.map((type,index)=>(
                        <div key={index} className={`flex items-center 
                        cursor-pointer gap-2 p-1 px-2 bg-white 
                        border border-gray-300 rounded-2xl
                        hover:bg-secondary ${interviewType.includes(type.name) && 'bg-blue-50 text-primary'}`}
                        onClick={() => handleTypeChange(type.name)}
                        >
                            <type.icon className="h-5 w-5"/>
                            <span>{type.name}</span>
                        </div>
                    ))}
                </div>
            </div> 
            <div className="mt-7 flex justify-end">
                <Button>Generate Question <ArrowRight /></Button>           
            </div>          
        </div>
    )
}

export default FormContainer
