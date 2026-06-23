import React from 'react'
import { Lightbulb, AlertCircle, CheckCircle2, Info } from 'lucide-react'

function RecruiterInsights({ insights }) {
    if (!insights || insights.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center justify-center min-h-[250px]">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Lightbulb className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-semibold">No insights yet</h3>
                <p className="text-sm text-slate-500 mt-1 text-center max-w-xs">
                    More candidate data is needed to generate meaningful recruiter insights.
                </p>
            </div>
        )
    }

    const getIcon = (type) => {
        switch (type) {
            case 'warning': return <AlertCircle className="h-5 w-5 text-amber-600" />;
            case 'success': return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
            case 'info': return <Info className="h-5 w-5 text-teal-600" />;
            default: return <Lightbulb className="h-5 w-5 text-slate-600" />;
        }
    }

    const getBgColor = (type) => {
        switch (type) {
            case 'warning': return 'bg-amber-50 border-amber-200';
            case 'success': return 'bg-emerald-50 border-emerald-200';
            case 'info': return 'bg-teal-50 border-teal-200';
            default: return 'bg-slate-50 border-slate-200';
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-8">
                <Lightbulb className="h-5 w-5 text-teal-600" />
                <h3 className="font-bold text-lg text-slate-900">Recruiter Insights</h3>
            </div>

            <div className="flex flex-col gap-5">
                {insights.map((insight, index) => (
                    <div key={index} className="flex gap-4 items-start p-5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <div className={`p-2.5 rounded-xl border flex-shrink-0 ${getBgColor(insight.type)}`}>
                            {getIcon(insight.type)}
                        </div>
                        <div className="flex flex-col gap-1.5 min-w-0 pr-2">
                            <h4 className="font-semibold text-slate-900 text-sm">{insight.title}</h4>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {insight.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default RecruiterInsights
