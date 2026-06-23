import React from 'react'
import { Activity, Clock, CheckCircle, FileText, UserPlus } from 'lucide-react'

function ActivityFeed({ activities }) {
    if (!activities || activities.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center justify-center h-full min-h-[300px]">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Activity className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-semibold">No recent activity</h3>
                <p className="text-sm text-slate-500 mt-1 text-center">
                    Candidate interviews and generated feedback will appear here.
                </p>
            </div>
        )
    }

    const getIcon = (type) => {
        switch (type) {
            case 'interview_created': return <FileText className="h-4 w-4 text-teal-600" />;
            case 'feedback_generated': return <CheckCircle className="h-4 w-4 text-emerald-600" />;
            case 'candidate_recommended': return <UserPlus className="h-4 w-4 text-teal-600" />;
            default: return <Clock className="h-4 w-4 text-slate-600" />;
        }
    }

    const getBgColor = (type) => {
        switch (type) {
            case 'interview_created': return 'bg-teal-50 border-teal-200';
            case 'feedback_generated': return 'bg-emerald-50 border-emerald-200';
            case 'candidate_recommended': return 'bg-teal-50 border-teal-200';
            default: return 'bg-slate-50 border-slate-200';
        }
    }

    // Helper to format "2 hours ago", "Yesterday", etc.
    const timeAgo = (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
                <Activity className="h-5 w-5 text-slate-700" />
                <h3 className="font-bold text-lg text-slate-900">Recent Activity</h3>
            </div>

            <div className="flex flex-col flex-grow relative">
                {/* Vertical Line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-200 z-0"></div>
                
                {activities.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex gap-4 items-start mb-6 last:mb-0 relative z-10">
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 bg-white ${getBgColor(activity.type)}`}>
                            {getIcon(activity.type)}
                        </div>
                        <div className="flex-grow pt-1">
                            <p className="text-sm text-slate-900 font-medium">
                                {activity.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span className="text-xs text-slate-500">{timeAgo(activity.date)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default ActivityFeed
