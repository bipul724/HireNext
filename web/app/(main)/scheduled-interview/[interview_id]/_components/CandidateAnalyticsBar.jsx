import { Users, Award, TrendingUp, Star } from "lucide-react";

export default function CandidateAnalyticsBar({ candidates }) {
    if (!candidates) return null;

    const totalCandidates = candidates.length;
    
    // Process candidate scores and recommendations
    let recommendedCount = 0;
    let totalScore = 0;
    let maxScore = 0;
    let scoredCandidates = 0;

    candidates.forEach(c => {
        const feedback = c?.feedback?.feedback ?? c?.feedback;
        if (feedback) {
            const recommendationValue = feedback.recommendation || feedback.Recommendation || "";
            const rec = recommendationValue.toLowerCase();
            if (rec.includes("hire") && !rec.includes("not") && !rec.includes("no hire")) {
                recommendedCount++;
            }
            
            const rating = feedback.rating;
            if (rating) {
                const tech = rating.technicalSkills ?? rating.techicalSkills ?? 0;
                const exp = rating.experience ?? rating.experince ?? 0;
                const score = (tech + (rating.communication ?? 0) + (rating.problemSolving ?? 0) + exp) / 4;
                totalScore += score;
                if (score > maxScore) maxScore = score;
                scoredCandidates++;
            }
        }
    });

    const averageScore = scoredCandidates > 0 ? (totalScore / scoredCandidates).toFixed(2) : 0;

    const statCards = [
        {
            title: "Total Candidates",
            value: totalCandidates,
            icon: Users,
            color: "text-slate-700",
            bg: "bg-slate-100",
            border: "border-slate-200"
        },
        {
            title: "Recommended",
            value: recommendedCount,
            subtitle: "Hire / Strong Hire",
            icon: CheckCircleIcon, // Will define below
            color: "text-emerald-700",
            bg: "bg-emerald-50",
            border: "border-emerald-200"
        },
        {
            title: "Average Score",
            value: scoredCandidates > 0 ? `${averageScore}/10` : "-",
            icon: TrendingUp,
            color: "text-sky-700",
            bg: "bg-sky-50",
            border: "border-sky-200"
        },
        {
            title: "Top Score",
            value: scoredCandidates > 0 ? `${maxScore}/10` : "-",
            icon: Award,
            color: "text-violet-700",
            bg: "bg-violet-50",
            border: "border-violet-200"
        }
    ];

    // Need a check icon
    function CheckCircleIcon(props) {
        return (
            <svg
                {...props}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col hover:border-slate-300 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-600">{stat.title}</h3>
                        </div>
                        <div className="mt-auto">
                            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                            {stat.subtitle && (
                                <p className="text-xs text-slate-400 mt-1 font-medium">{stat.subtitle}</p>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
