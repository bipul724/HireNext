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
        name:"Problem Solving",
        icon: Puzzle,
        path: "/phone-interview",
    },
    {
        name:"Leadership",
        icon: Grid,
        path: "/phone-interview",
    }
]
