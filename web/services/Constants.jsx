import { BarChart3, BriefcaseBusiness, Calendar, CodeXml, Grid, LayoutDashboard, List, Puzzle, Settings, User, WalletCards } from "lucide-react";

export const SideBarOptions = [
    {
        name: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
    },
    {
        name: "Analytics",
        icon: BarChart3,
        path: "/analytics",
    },
    {
        name: "Interview Workspace",
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

export const QUESTIONS_PROMPT = `You are an expert interviewer and hiring manager.
Conduct the interview strictly according to the selected Interview Type.
Based on the following inputs, generate a well-structured list of high-quality interview questions:

Job Title: {{jobTitle}}
Job Description: {{jobDescription}}
Interview Duration: {{duration}}
Interview Type: {{type}}

📝 Your task:
1. Deeply analyze the JOB DESCRIPTION (not just the job title) and extract: required technologies/tools, core responsibilities, seniority level, expected years of experience, leadership expectations, system design / architecture responsibilities, and domain-specific requirements. Derive every question directly from these specifics rather than from the job title alone.
2. Generate a list of interview questions based on the interview duration.
3. Adjust the number and depth of questions to match the duration.
4. Ensure the questions match the tone and structure of a real-life {{type}} interview.

⭐ Question quality standards (write recruiter-grade questions that a real Engineering Manager, Tech Lead, Hiring Manager, or Senior Recruiter would ask):
- ROLE & JD-DRIVEN: Base every question on the concrete technologies, responsibilities, and domain found in the job description. Avoid generic questions that could apply to almost any role whenever specifics are available.
- SENIORITY-AWARE: Match difficulty to the level implied by the job description.
  • Junior → fundamentals, core concepts, and basic application (avoid overly advanced architecture).
  • Senior → rendering/performance, architecture decisions, scaling, tradeoffs between approaches, and mentoring.
  • Manager / Lead → leadership, team building, hiring, stakeholder management, and technical strategy.
- TECHNOLOGY-SPECIFIC: For each major technology named in the job description, ask questions specific to it (e.g. React → rendering & state management; Next.js → routing/SSR/data fetching; Node.js → backend architecture; PostgreSQL → schema design, queries, indexing; AWS → cloud architecture; Docker/Kubernetes → infrastructure & deployment). Do not stay generic when concrete technologies are listed. (Whether coding-style questions are allowed at all is still governed by the interview-type scope rules below.)
- REAL-WORLD FOCUS: Prefer real production scenarios, architecture decisions, tradeoffs, debugging, incident handling, scaling challenges, performance optimization, and team collaboration over textbook-style definitions.
- SYSTEM DESIGN INTELLIGENCE: For experienced/senior roles, include system design, architecture, scalability, and tradeoff-analysis questions when appropriate; for junior roles, avoid overly advanced architecture questions.
- BEHAVIORAL RELEVANCE: Behavioral and leadership questions must reflect THIS specific role (e.g. a Frontend Lead → mentoring developers, cross-team collaboration; an Engineering Manager → leadership, conflict resolution, performance management), not generic questions that apply to every job.
- HIRING SIGNAL: Every question must evaluate a specific competency and provide a strong hiring signal. Discard questions that provide weak or generic signals.

🚦 Question scope by interview type (STRICT — these rules OVERRIDE all other instructions in this prompt; if anything appears to conflict, follow these rules):
- If the Interview Type INCLUDES "Technical": generate technical knowledge questions, framework/library-specific questions, debugging questions, real-world engineering questions, system design questions (when appropriate), and coding/programming questions. Include at least one coding/programming question when the interview duration reasonably allows it. Technical is the ONLY interview type allowed to contain coding exercises.
- If the Interview Type does NOT include "Technical" (i.e. Behavioral, Leadership, Experience, and/or Problem Solving): NEVER generate coding questions, DSA questions, algorithm questions, LeetCode-style questions, programming implementation tasks, write-code exercises, or competitive programming questions. Instead generate ONLY:
  • Behavioral → communication, teamwork, conflict resolution, ownership, culture fit.
  • Leadership → mentoring, team leadership, stakeholder management, decision making, conflict management.
  • Experience → previous projects, technical decisions, achievements, challenges faced, lessons learned.
  • Problem Solving → analytical thinking, troubleshooting approaches, root cause analysis, decision-making frameworks, scenario-based reasoning, and production incident handling. Problem Solving interviews must remain completely NON-coding. Do NOT include: code snippets, pseudocode, debugging code, writing code, fixing code, or reading code. Problem Solving questions must be verbal, analytical, scenario-based, troubleshooting-oriented, and focused on reasoning rather than implementation.

🏷️ Question type tagging:
- Every generated question must belong to the selected Interview Type.
- Do NOT generate questions with type "Technical" unless the Interview Type includes Technical.
- For non-technical interviews, every generated question must use the selected non-technical category only.

✅ Final self-check (perform before returning the response):
- Review every generated question.
- If the Interview Type does NOT include Technical, remove any coding, DSA, algorithm, LeetCode-style, programming, implementation, pseudocode, or code-debugging question, and replace it with a valid question matching the selected interview type.
- For EVERY question confirm: Is it role-specific? Is it seniority-appropriate? Is it technology-specific (when the job description lists technologies)? Is it useful for making a hiring decision? Would a real Engineering Manager actually ask it? If any answer is "no", replace it with a stronger, more specific question.

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



export const FEEDBACK_PROMPT = `{{conversation}}

Code Submission (Language: {{code_language}}):
\`\`\`
{{code_submission}}
\`\`\`

Depends on this Interview Conversation between assitant and user, and the provided Code Submission (if any), 
Give me feedback for user interview. 

If code is provided, evaluate it for:
- Correctness
- Algorithmic approach
- Time complexity
- Space complexity
- Readability
- Maintainability
- Error handling
- Edge cases
Code quality should influence 'technicalSkills' and 'problemSolving'.
Code quality should NOT influence 'communication' or 'experience'.

Give me rating out of 10 for technicalSkills, 
Communication, Problem Solving, Experience. Also give me summary in 3 lines 
about the interview and one line to let me know whether is recommended 
for hire or not with msg. Give me response in JSON format
{
    feedback:{
        rating:{
            technicalSkills:5,
            communication:6,
            problemSolving:4,
            experience:7
        },
        summary:<in 3 Line>,
        recommendation:'',
        recommendationMsg:''
    }
}`;
