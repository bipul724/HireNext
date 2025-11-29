import { BriefcaseBusiness, Calendar, CodeXml, Grid, LayoutDashboard, List, Puzzle, Settings, User, WalletCards } from "lucide-react";

export const SideBarOptions = [
    {
        name: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
    },
    {
        name: "Scheduled Interview",
        icon: Calendar,
        path: "/scheduled-interview",
    },
    {
        name: "All Interview",
        icon: List,
        path: "/all-interview",
    },
    {
        name: "Billing",
        icon: WalletCards,
        path: "/billing",
    },
    {
        name: "Settings",
        icon: Settings,
        path: "/settings",
    }
]

export const InterviewType = [
    {
        name: "Technical",
        icon: CodeXml,
        path: "/video-interview",
    },
    {
        name: "Behavioral",
        icon: User,
        path: "/phone-interview",
    },
    {
        name: "Experience",
        icon: BriefcaseBusiness,
        path: "/phone-interview",
    },
    {
        name: "Problem Solving",
        icon: Puzzle,
        path: "/phone-interview",
    },
    {
        name: "Leadership",
        icon: Grid,
        path: "/phone-interview",
    }
]

export const QUESTIONS_PROMPT = `You are an expert technical interviewer.
Based on the following inputs, generate a well-structured list of high-quality interview questions:

Job Title: {{jobTitle}}
Job Description: {{jobDescription}}
Interview Duration: {{duration}}
Interview Type: {{type}}

📝 Your task:
1. Analyze the job description to identify key responsibilities, required skills, and expected experience.
2. Generate a list of interview questions based on the interview duration.
3. Adjust the number and depth of questions to match the duration.
4. Ensure the questions match the tone and structure of a real-life {{type}} interview.

🧩 Format your response in JSON format with an array list of questions.
Required JSON Structure:
{
  "interviewQuestions": [
    {
      "question": "The question text here",
      "type": "Technical/Behavioral/Experience/Problem Solving/Leadership"
    }
  ]
}

🎯 The goal is to create a structured, relevant, and time-optimized interview plan for a {{jobTitle}} role.`;
