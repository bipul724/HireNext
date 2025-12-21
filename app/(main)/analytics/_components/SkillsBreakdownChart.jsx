"use client"
import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function SkillsBreakdownChart({ data }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Skills Breakdown</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Average scores by category</p>

            {data && data.length > 0 && data.some(d => d.value > 0) ? (
                <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                            <XAxis
                                type="number"
                                domain={[0, 10]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                            />
                            <YAxis
                                type="category"
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                width={100}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value) => [`${value}/10`, 'Score']}
                            />
                            <Bar
                                dataKey="value"
                                radius={[0, 4, 4, 0]}
                                barSize={24}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[280px] flex items-center justify-center text-gray-400">
                    No skill data available yet
                </div>
            )}
        </div>
    )
}

export default SkillsBreakdownChart
