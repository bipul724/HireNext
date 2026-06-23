import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function StatCard({ title, value, icon: Icon, description, color = 'teal', trend, trendDirection }) {
    const colorClasses = {
        primary: 'bg-primary/10 text-primary border-primary/20',
        teal: 'bg-teal-50 text-teal-600 border-teal-200',
        sky: 'bg-teal-50 text-teal-600 border-teal-200',
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        indigo: 'bg-teal-50 text-teal-600 border-teal-200',
        rose: 'bg-rose-50 text-rose-600 border-rose-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200'
    }

    const renderTrend = () => {
        if (!trend) return null;
        
        let TrendIcon = Minus;
        let trendColor = "text-slate-400";
        let trendBg = "bg-slate-100";
        
        if (trendDirection === 'up') {
            TrendIcon = TrendingUp;
            trendColor = "text-emerald-600";
            trendBg = "bg-emerald-50";
        } else if (trendDirection === 'down') {
            TrendIcon = TrendingDown;
            trendColor = "text-rose-600";
            trendBg = "bg-rose-50";
        }

        return (
            <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${trendBg} ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                <span>{trend}</span>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between">
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl border transition-colors ${colorClasses[color]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-slate-500 text-sm font-bold tracking-wide uppercase">{title}</p>
                </div>
                
                <div className="flex items-end justify-between">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tight">{value}</h3>
                    {renderTrend()}
                </div>
            </div>
            
            {description && (
                <p className="text-sm font-medium text-slate-500 mt-4 pt-4 border-t border-slate-100">
                    {description}
                </p>
            )}
        </div>
    )
}

export default StatCard
