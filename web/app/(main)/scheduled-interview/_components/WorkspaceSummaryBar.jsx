import { Briefcase, Users, Clock, TrendingUp, ArrowUpRight } from "lucide-react"

function WorkspaceSummaryBar({ stats }) {
    const cards = [
        {
            label: "Total Interviews",
            value: stats.total,
            icon: Briefcase,
            accent: "bg-teal-50 text-teal-600 ring-1 ring-teal-100",
            trend: stats.total > 0 ? `${stats.total} created` : null,
        },
        {
            label: "Active Interviews",
            value: stats.active,
            icon: TrendingUp,
            accent: "bg-sky-50 text-sky-600 ring-1 ring-sky-100",
            trend: stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% active` : null,
        },
        {
            label: "Total Candidates",
            value: stats.candidates,
            icon: Users,
            accent: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
            trend: stats.total > 0 ? `~${(stats.candidates / stats.total).toFixed(1)} per interview` : null,
        },
        {
            label: "Avg Duration",
            value: `${stats.avgDuration}m`,
            icon: Clock,
            accent: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
            trend: stats.avgDuration > 0 ? `${stats.avgDuration} minutes avg` : null,
        },
    ]

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((card) => (
                <div
                    key={card.label}
                    className="group bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-200"
                >
                    <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-lg ${card.accent}`}>
                            <card.icon className="h-4 w-4" />
                        </div>
                        {card.trend && (
                            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <ArrowUpRight className="h-3 w-3" />
                                {card.trend}
                            </span>
                        )}
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-3 leading-none">{card.value}</p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">{card.label}</p>
                </div>
            ))}
        </div>
    )
}

export default WorkspaceSummaryBar
