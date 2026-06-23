"use client"
import React from 'react'
import { useUser } from '@/app/provider'
import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import StatCard from './_components/StatCard'
import TopCandidates from './_components/TopCandidates'
import RecruiterInsights from './_components/RecruiterInsights'
import InterviewPerformance from './_components/InterviewPerformance'
import ActivityFeed from './_components/ActivityFeed'
import SkillsBreakdownChart from './_components/SkillsBreakdownChart'
import RecentCandidates from './_components/RecentCandidates'
import { Users, Calendar, TrendingUp, Award, Target, UserCheck } from 'lucide-react'

function Analytics() {
    const { user } = useUser()
    const [loading, setLoading] = useState(true)
    
    const [stats, setStats] = useState({
        totalInterviews: 0,
        totalCandidates: 0,
        recommendedCount: 0,
        hireRate: 0,
        avgRating: 0,
        topScore: 0
    })
    
    const [topCandidatesData, setTopCandidatesData] = useState([])
    const [insightsData, setInsightsData] = useState([])
    const [performanceData, setPerformanceData] = useState([])
    const [activityData, setActivityData] = useState([])
    const [skillsData, setSkillsData] = useState([])

    useEffect(() => {
        if (user) {
            fetchAnalyticsData()
        }
    }, [user])

    const fetchAnalyticsData = async () => {
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const token = session?.access_token
            
            const response = await fetch('/api/analytics/kpis', {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            })
            
            if (!response.ok) throw new Error("Failed to fetch KPIs")
            const data = await response.json()
            
            // 1. Stats
            const recommendedCount = Math.round((data.totalCandidates || 0) * ((data.hireRate || 0) / 100))
            setStats({
                totalInterviews: data.totalInterviews || 0,
                totalCandidates: data.totalCandidates || 0,
                recommendedCount,
                hireRate: data.hireRate || 0,
                avgRating: data.avgRating || 0,
                topScore: data.topScore || 0
            })

            // 2. Role Performance
            setPerformanceData(data.rolePerformance || [])

            // 3. Skills Data
            const sp = data.skillsPerformance || { technicalSkills: 0, communication: 0, problemSolving: 0, experience: 0 }
            const skillsArray = [
                { name: 'Technical', avg: sp.technicalSkills || 0 },
                { name: 'Communication', avg: sp.communication || 0 },
                { name: 'Problem Solving', avg: sp.problemSolving || 0 },
                { name: 'Experience', avg: sp.experience || 0 }
            ].sort((a, b) => a.avg - b.avg)

            setSkillsData(skillsArray.map(s => ({
                name: s.name,
                value: parseFloat(s.avg.toFixed(1)),
                fill: s.name === 'Technical' ? '#0f766e' : s.name === 'Communication' ? '#14b8a6' : s.name === 'Problem Solving' ? '#f59e0b' : '#10b981'
            })))

            // 4. Insights Generation
            let generatedInsights = []
            if (data.totalCandidates > 0) {
                const weakestSkill = skillsArray[0]
                const strongestSkill = skillsArray[3]
                
                if (weakestSkill.avg > 0) {
                    generatedInsights.push({
                        type: 'warning',
                        title: `${weakestSkill.name} is the weakest skill category`,
                        description: `Candidates are averaging ${weakestSkill.avg.toFixed(1)}/10. Consider adding additional ${weakestSkill.name.toLowerCase()} screening questions early in the pipeline.`
                    })
                }

                if (strongestSkill.avg > 0 && strongestSkill.avg - weakestSkill.avg >= 1.5) {
                    generatedInsights.push({
                        type: 'success',
                        title: `Strong ${strongestSkill.name} performance`,
                        description: `Candidates consistently overperform in ${strongestSkill.name.toLowerCase()} (${strongestSkill.avg.toFixed(1)}/10). The current sourcing strategy is capturing this skill well.`
                    })
                }

                if (data.hireRate < 15 && data.totalCandidates >= 5) {
                    generatedInsights.push({
                        type: 'warning',
                        title: `Low recommendation rate`,
                        description: `Only ${data.hireRate}% of candidates are recommended. Interview difficulty may be too high, or sourcing quality needs review.`
                    })
                } else if (data.hireRate >= 50 && data.totalCandidates >= 5) {
                    generatedInsights.push({
                        type: 'info',
                        title: `High recommendation rate`,
                        description: `A ${data.hireRate}% recommendation rate indicates strong pipeline quality, but ensure interview rigor is maintained.`
                    })
                }
            }
            setInsightsData(generatedInsights)

            // 5. Missing Data (Not provided by RPC)
            setTopCandidatesData([])
            setActivityData([])

        } catch (err) {
            console.error("Error fetching analytics:", err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="p-10 flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
            <div className="mb-8">
                <h2 className="font-bold text-2xl text-slate-900 tracking-tight">Intelligence Center</h2>
                <p className="text-slate-500 mt-1">Recruiter insights and candidate performance tracking.</p>
            </div>

            {/* Row 1: Executive Summary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Interviews" value={stats.totalInterviews} icon={Calendar} description="Active interview links" color="teal" trend="+2" trendDirection="up" />
                <StatCard title="Total Candidates" value={stats.totalCandidates} icon={Users} description="Interviews completed" color="emerald" trend="+14%" trendDirection="up" />
                <StatCard title="Recommended" value={stats.recommendedCount} icon={UserCheck} description="Hire or Maybe" color="emerald" trend="Steady" trendDirection="neutral" />
                <StatCard title="Hire Rate" value={`${stats.hireRate}%`} icon={Award} description="Conversion to hire" color="primary" />
                <StatCard title="Average Score" value={stats.avgRating} icon={TrendingUp} description="Out of 10 points" color="teal" />
                <StatCard title="Top Score" value={stats.topScore} icon={Target} description="Highest performer" color="amber" />
            </div>

            {/* Row 2: Top Candidates + Recruiter Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 mb-8">
                <div>
                    <TopCandidates candidates={topCandidatesData} />
                </div>
                <div>
                    <RecruiterInsights insights={insightsData} />
                </div>
            </div>

            {/* Row 3: Interview Performance */}
            <div className="grid grid-cols-1 mb-6">
                <InterviewPerformance performanceData={performanceData} />
            </div>

            {/* Row 4: Charts (Secondary) + Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <ActivityFeed activities={activityData} />
                <SkillsBreakdownChart data={skillsData} />
            </div>

            {/* Row 5: Recent Candidates Table */}
            <div className="grid grid-cols-1">
                <RecentCandidates totalCount={stats.totalCandidates} userEmail={user?.primaryEmailAddress?.emailAddress || user?.email} />
            </div>
        </div>
    )
}

export default Analytics
