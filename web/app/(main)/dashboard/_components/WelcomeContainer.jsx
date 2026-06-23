"use client"
import { useUser } from "@/app/provider"
import Image from "next/image"

function WelcomeContainer(){
    const {user} = useUser()

    return (
        <div className="bg-white px-5 py-4 sm:px-6 sm:py-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
            <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">Welcome Back, {user?.name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">AI-Driven Interviews, Hassle-Free Hiring</p>
            </div>
            {user && (
                user?.picture ? (
                    <Image
                        src={user?.picture}
                        alt="userAvatar"
                        width={44}
                        height={44}
                        className="rounded-full ring-2 ring-white shadow-sm shrink-0"
                    />
                ) : (
                    <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-base font-semibold shadow-sm shadow-teal-500/20">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                )
            )}
        </div>
    )
}

export default WelcomeContainer
