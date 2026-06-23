import { Search, SlidersHorizontal, Plus, Send, Users, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function WorkspaceEmptyState({ variant, onClearSearch, onClearFilters }) {
    // ── No Interviews: Recruiter onboarding experience ──
    if (variant === "no-interviews") {
        const steps = [
            {
                step: "1",
                title: "Create Interview",
                description: "Set up an AI-powered interview with custom questions for any role.",
                icon: Plus,
                accent: "bg-teal-600 text-white",
            },
            {
                step: "2",
                title: "Share Link",
                description: "Send the unique interview link to candidates via email.",
                icon: Send,
                accent: "bg-sky-600 text-white",
            },
            {
                step: "3",
                title: "Review Candidates",
                description: "Get AI-generated feedback, ratings, and hiring recommendations.",
                icon: Users,
                accent: "bg-emerald-600 text-white",
            },
        ]

        return (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                {/* Hero section */}
                <div className="px-6 pt-10 pb-8 sm:px-10 text-center">
                    <div className="inline-flex p-3.5 bg-teal-50 rounded-2xl mb-4">
                        <svg className="h-10 w-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                        </svg>
                    </div>
                    <h3 className="font-bold text-xl text-slate-900">
                        Start building your interview pipeline
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                        Create AI-powered interviews, share them with candidates, and receive detailed feedback — all in one workspace.
                    </p>
                    <Link href="/dashboard/create-interview" className="inline-block mt-5">
                        <Button size="sm" className="h-9 px-5">
                            <Plus className="h-4 w-4 mr-1.5" />
                            Create Your First Interview
                        </Button>
                    </Link>
                </div>

                {/* 3-step guide */}
                <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-6 sm:px-10">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">How it works</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {steps.map((s) => (
                            <div key={s.step} className="flex items-start gap-3">
                                <div className={`shrink-0 h-8 w-8 rounded-lg ${s.accent} flex items-center justify-center`}>
                                    <s.icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    // ── No results / No filter match ──
    const configs = {
        "no-results": {
            icon: Search,
            title: "No interviews found",
            description: "No interviews match your search. Try different keywords.",
            actionLabel: "Clear Search",
            onAction: onClearSearch,
        },
        "no-filter-match": {
            icon: SlidersHorizontal,
            title: "No matching interviews",
            description: "No interviews match the selected filters. Adjust or reset them.",
            actionLabel: "Reset Filters",
            onAction: onClearFilters,
        },
    }

    const config = configs[variant]
    if (!config) return null

    const Icon = config.icon

    return (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl py-16 px-6 flex flex-col items-center text-center gap-3">
            <div className="p-3 bg-slate-50 rounded-xl ring-1 ring-slate-100">
                <Icon className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="font-semibold text-slate-700">{config.title}</h3>
            <p className="text-sm text-slate-500 max-w-xs">{config.description}</p>
            <Button variant="outline" size="sm" onClick={config.onAction} className="mt-1">
                {config.actionLabel}
            </Button>
        </div>
    )
}

export default WorkspaceEmptyState
