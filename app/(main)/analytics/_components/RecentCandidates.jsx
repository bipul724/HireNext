"use client"
import React from 'react'
import { Users } from 'lucide-react'
import moment from 'moment'

function RecentCandidates({ candidates }) {
    const calculateAvgRating = (feedback) => {
        const rating = feedback?.feedback?.rating
        if (!rating) return 0
        const avg = (
            (rating.technicalSkills || rating.techicalSkills || 0) +
            (rating.communication || 0) +
            (rating.problemSolving || 0) +
            (rating.experience || rating.experince || 0)
        ) / 4
        return avg.toFixed(1)
    }

    const isRecommended = (feedback) => {
        const recommendation = feedback?.feedback?.Recommendation || ''
        if (recommendation.toLowerCase().includes('not')) return false
        return recommendation.toLowerCase().includes('yes') ||
            recommendation.toLowerCase().includes('hire') ||
            recommendation.toLowerCase().includes('recommend')
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Recent Candidates</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Latest interview results</p>
                </div>
                <div className="p-2 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                    <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
            </div>

            {candidates && candidates.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                <th className="pb-3 font-medium">Candidate</th>
                                <th className="pb-3 font-medium">Rating</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 font-medium text-right">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {candidates.map((candidate, index) => {
                                const avgRating = calculateAvgRating(candidate.feedback)
                                const recommended = isRecommended(candidate.feedback)

                                return (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {candidate.userName?.[0]?.toUpperCase() || candidate.userEmail?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">{candidate.userName || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{candidate.userEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">
                                                {avgRating}/10
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            {recommended ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                                                    ✓ Recommended
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                                                    ✗ Not Recommended
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 text-right text-sm text-gray-500 dark:text-gray-400">
                                            {moment(candidate.created_at).fromNow()}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No candidates interviewed yet</p>
                    <p className="text-sm mt-1">Create and share interviews to see candidate data here</p>
                </div>
            )}
        </div>
    )
}

export default RecentCandidates
