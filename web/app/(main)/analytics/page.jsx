"use client"
import React from 'react'
import { useUser } from '@/app/provider'
import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import StatCard from './_components/StatCard'
import InterviewTrendsChart from './_components/InterviewTrendsChart'
import SkillsBreakdownChart from './_components/SkillsBreakdownChart'
import RecentCandidates from './_components/RecentCandidates'
import { Users, Calendar, TrendingUp, Award } from 'lucide-react'

function Analytics() {
    const { user } = useUser()
    const [interviews, setInterviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalInterviews: 0,
        totalCandidates: 0,
        avgRating: 0,
        hireRate: 0
    })
    const [skillsData, setSkillsData] = useState([])
    const [trendsData, setTrendsData] = useState([])
    const [recentCandidates, setRecentCandidates] = useState([])

    useEffect(() => {
        if (user) {
            fetchAnalyticsData()
        }
    }, [user])

    const fetchAnalyticsData = async () => {
        setLoading(true)
        try {
            // Fetch all interviews with feedback
            const { data: interviewsData, error } = await supabase
                .from("Interviews")
                .select("*, interview-feedback(*)")
                .eq("userEmail", user?.email)
                .order("created_at", { ascending: false })

            if (error) throw error

            setInterviews(interviewsData || [])
            processAnalytics(interviewsData || [])
        } catch (err) {
            console.error("Error fetching analytics:", err)
        } finally {
            setLoading(false)
        }
    }

    const processAnalytics = (data) => {
        // Calculate total stats
        const totalInterviews = data.length
        let allFeedback = []

        data.forEach(interview => {
            if (interview['interview-feedback']) {
                allFeedback = [...allFeedback, ...interview['interview-feedback']]
            }
        })

        const totalCandidates = allFeedback.length

        // Calculate average rating
        let totalRating = 0
        let ratingCount = 0
        let recommendedCount = 0

        // Skill totals
        let skillTotals = {
            technicalSkills: 0,
            communication: 0,
            problemSolving: 0,
            experience: 0
        }

        allFeedback.forEach(fb => {
            const rating = fb.feedback?.feedback?.rating
            if (rating) {
                const avg = (
                    (rating.technicalSkills || rating.techicalSkills || 0) +
                    (rating.communication || 0) +
                    (rating.problemSolving || 0) +
                    (rating.experience || rating.experince || 0)
                ) / 4
                totalRating += avg
                ratingCount++

                skillTotals.technicalSkills += (rating.technicalSkills || rating.techicalSkills || 0)
                skillTotals.communication += (rating.communication || 0)
                skillTotals.problemSolving += (rating.problemSolving || 0)
                skillTotals.experience += (rating.experience || rating.experince || 0)
            }

            const recommendation = fb.feedback?.feedback?.Recommendation || ''
            if (recommendation.toLowerCase().includes('yes') ||
                recommendation.toLowerCase().includes('hire') ||
                recommendation.toLowerCase().includes('recommend')) {
                if (!recommendation.toLowerCase().includes('not')) {
                    recommendedCount++
                }
            }
        })

        const avgRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0
        const hireRate = totalCandidates > 0 ? Math.round((recommendedCount / totalCandidates) * 100) : 0

        setStats({
            totalInterviews,
            totalCandidates,
            avgRating,
            hireRate
        })

        // Skills breakdown data
        const skillsCount = ratingCount || 1
        setSkillsData([
            { name: 'Technical', value: parseFloat((skillTotals.technicalSkills / skillsCount).toFixed(1)), fill: '#6366f1' },
            { name: 'Communication', value: parseFloat((skillTotals.communication / skillsCount).toFixed(1)), fill: '#8b5cf6' },
            { name: 'Problem Solving', value: parseFloat((skillTotals.problemSolving / skillsCount).toFixed(1)), fill: '#a855f7' },
            { name: 'Experience', value: parseFloat((skillTotals.experience / skillsCount).toFixed(1)), fill: '#d946ef' }
        ])

        // Trends data (last 7 days)
        const last7Days = []
        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

            const interviewsOnDay = data.filter(interview => {
                const interviewDate = new Date(interview.created_at).toISOString().split('T')[0]
                return interviewDate === dateStr
            }).length

            const candidatesOnDay = data.filter(interview => {
                const interviewDate = new Date(interview.created_at).toISOString().split('T')[0]
                return interviewDate === dateStr
            }).reduce((acc, interview) => acc + (interview['interview-feedback']?.length || 0), 0)

            last7Days.push({
                day: dayName,
                interviews: interviewsOnDay,
                candidates: candidatesOnDay
            })
        }
        setTrendsData(last7Days)

        // Recent candidates (last 5)
        const sortedCandidates = allFeedback
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 5)
        setRecentCandidates(sortedCandidates)
    }

    if (loading) {
        return (
            <div className="p-10">
                <h2 className="font-bold text-2xl">Analytics</h2>
                <div className="mt-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 md:p-10">
            <div className="mb-8">
                <h2 className="font-bold text-2xl">Analytics</h2>
                <p className="text-gray-500 mt-1">Track your interview performance and insights</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title="Total Interviews"
                    value={stats.totalInterviews}
                    icon={Calendar}
                    description="Interviews created"
                    color="indigo"
                />
                <StatCard
                    title="Total Candidates"
                    value={stats.totalCandidates}
                    icon={Users}
                    description="Candidates interviewed"
                    color="violet"
                />
                <StatCard
                    title="Avg. Rating"
                    value={`${stats.avgRating}/10`}
                    icon={TrendingUp}
                    description="Average candidate score"
                    color="purple"
                />
                <StatCard
                    title="Hire Rate"
                    value={`${stats.hireRate}%`}
                    icon={Award}
                    description="Recommended for hire"
                    color="fuchsia"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <InterviewTrendsChart data={trendsData} />
                <SkillsBreakdownChart data={skillsData} />
            </div>

            {/* Recent Candidates */}
            <RecentCandidates candidates={recentCandidates} />
        </div>
    )
}

export default Analytics
