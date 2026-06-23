import React from "react"
import WelcomeContainer from "./_components/WelcomeContainer"
import CreateOptions from "./_components/CreateOptions"
import LatestInterviewsList from "./_components/LatestInterviewsList"

function Dashboard(){
    return (
        <div className="space-y-8">
            {/* <WelcomeContainer /> */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-500 mt-1">Create and manage your AI-driven interviews.</p>
            </div>
            <CreateOptions />
            <LatestInterviewsList />
        </div>
    )
}

export default Dashboard