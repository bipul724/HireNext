import React from 'react'

function StatCard({ title, value, icon: Icon, description, color = 'indigo' }) {
    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        violet: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        fuchsia: 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-900/20 dark:text-fuchsia-400',
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
                    <h3 className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{value}</h3>
                    {description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    )
}

export default StatCard
