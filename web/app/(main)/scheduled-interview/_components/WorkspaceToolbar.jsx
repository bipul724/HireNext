import { Search, X, ArrowUpDown } from "lucide-react"
import { InterviewType } from "@/services/Constants"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

function WorkspaceToolbar({
    searchInput,
    onSearchChange,
    selectedTypes,
    onTypeToggle,
    sortBy,
    onSortChange,
    resultCount,
    onClearFilters,
    hasFilters,
}) {
    const activeFilterCount = selectedTypes.length + (searchInput.trim() ? 1 : 0)

    return (
        <div className="sticky top-0 z-10 py-1">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-sm">
                {/* Row 1: Search + Sort */}
                <div className="flex flex-col sm:flex-row gap-3 p-3 pb-0 sm:p-4 sm:pb-0">
                    <div className="relative flex-1 group/search">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within/search:text-teal-500 transition-colors pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search interviews..."
                            value={searchInput}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-9 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all placeholder:text-slate-400"
                        />
                        {searchInput && (
                            <button
                                onClick={() => onSearchChange("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-100 active:bg-slate-200 transition-colors"
                            >
                                <X className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                        )}
                    </div>
                    <Select value={sortBy} onValueChange={onSortChange}>
                        <SelectTrigger className="w-full sm:w-[180px] shrink-0 text-sm h-[38px]">
                            <div className="flex items-center gap-1.5">
                                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="candidates">Most Candidates</SelectItem>
                            <SelectItem value="alphabetical">Alphabetical</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Row 2: Type filter chips + meta */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 sm:p-4 pt-2.5">
                    <div className="flex flex-wrap gap-1.5">
                        {InterviewType.map((type) => {
                            const isActive = selectedTypes.includes(type.name)
                            return (
                                <button
                                    key={type.name}
                                    onClick={() => onTypeToggle(type.name)}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all duration-150 cursor-pointer select-none ${
                                        isActive
                                            ? "bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-600/20"
                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300 active:bg-slate-150"
                                    }`}
                                >
                                    <type.icon className="h-3 w-3" />
                                    {type.name}
                                </button>
                            )
                        })}
                    </div>
                    <div className="flex items-center gap-2.5 text-xs shrink-0">
                        <span className="text-slate-400 font-medium tabular-nums">
                            {resultCount} result{resultCount !== 1 ? "s" : ""}
                        </span>
                        {hasFilters && (
                            <button
                                onClick={onClearFilters}
                                className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-semibold transition-colors"
                            >
                                <X className="h-3 w-3" />
                                Clear{activeFilterCount > 1 ? ` (${activeFilterCount})` : ""}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WorkspaceToolbar
