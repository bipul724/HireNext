import React from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Check } from "lucide-react"

function Billing() {
    // Mock Data
    const currentPlan = {
        name: "Free Plan",
        status: "Active",
        cycle: "Monthly",
        amount: "$0",
        nextBillingDate: "2024-01-01"
    }

    const usage = {
        used: 5,
        total: 10,
        label: "AI Interviews Generated"
    }

    const billingHistory = [
        {
            id: "INV-001",
            date: "2023-12-01",
            amount: "$0.00",
            status: "Paid",
            plan: "Free Monthly"
        },
        {
            id: "INV-002",
            date: "2023-11-01",
            amount: "$0.00",
            status: "Paid",
            plan: "Free Monthly"
        }
    ]

    return (
        <div className='p-10'>
            <h2 className='font-bold text-2xl'>Billing & Subscription</h2>
            <p className='text-gray-500 mt-2'>Manage your subscription plan and billing details.</p>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-10 mt-10'>
                {/* Current Plan */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Current Plan</CardTitle>
                        <CardDescription>You are currently on the {currentPlan.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className='flex justify-between items-center'>
                            <span className='font-medium'>Status:</span>
                            <span className='text-green-600 bg-green-100 px-3 py-1 rounded-full text-sm font-medium'>{currentPlan.status}</span>
                        </div>
                        <div className='flex justify-between items-center'>
                            <span className='font-medium'>Next Billing:</span>
                            <span>{currentPlan.nextBillingDate}</span>
                        </div>
                        <div className='flex justify-between items-center'>
                            <span className='font-medium'>Amount:</span>
                            <span>{currentPlan.amount} / {currentPlan.cycle}</span>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button variant="outline">Manage Subscription</Button>
                    </CardFooter>
                </Card>

                {/* Usage */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Usage</CardTitle>
                        <CardDescription>Your resource consumption for this cycle</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <div className='flex justify-between mb-2 text-sm'>
                                <span>{usage.label}</span>
                                <span className='font-medium'>{usage.used} / {usage.total}</span>
                            </div>
                            <Progress value={(usage.used / usage.total) * 100} className="w-full h-2" />
                            <p className='text-xs text-gray-400 mt-2'>Resets on {currentPlan.nextBillingDate}</p>
                        </div>
                        <div className='p-4 bg-muted/50 rounded-lg'>
                            <p className='text-sm'>Need more interviews? Upgrade to Pro for unlimited access.</p>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button>Upgrade to Pro</Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Upgrade Options */}
            <div className='mt-10'>
                <h3 className='font-bold text-xl mb-5'>Available Plans</h3>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                    <Card className="border-2 border-primary/20 relative overflow-hidden">
                        <div className='absolute top-0 right-0 bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-bl-lg'>Current</div>
                        <CardHeader>
                            <CardTitle>Free</CardTitle>
                            <CardDescription>For basic interview practice</CardDescription>
                            <div className='mt-2'>
                                <span className='text-3xl font-bold'>$0</span><span className='text-gray-500'>/mo</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ul className='space-y-2 text-sm'>
                                <li className='flex items-center gap-2'><Check className="w-4 h-4 text-primary" /> 10 AI Interviews/mo</li>
                                <li className='flex items-center gap-2'><Check className="w-4 h-4 text-primary" /> Basic Analytics</li>
                                <li className='flex items-center gap-2'><Check className="w-4 h-4 text-primary" /> Email Support</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" variant="outline" disabled>Current Plan</Button>
                        </CardFooter>
                    </Card>

                    <Card className="border-2 border-primary shadow-lg">
                        <CardHeader>
                            <CardTitle>Pro</CardTitle>
                            <CardDescription>For serious job seekers</CardDescription>
                            <div className='mt-2'>
                                <span className='text-3xl font-bold'>$9</span><span className='text-gray-500'>/mo</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ul className='space-y-2 text-sm'>
                                <li className='flex items-center gap-2'><Check className="w-4 h-4 text-primary" /> Unlimited Interviews</li>
                                <li className='flex items-center gap-2'><Check className="w-4 h-4 text-primary" /> Advanced Analytics</li>
                                <li className='flex items-center gap-2'><Check className="w-4 h-4 text-primary" /> Priority Support</li>
                                <li className='flex items-center gap-2'><Check className="w-4 h-4 text-primary" /> Custom Questions</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full">Upgrade Now</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>


            {/* Billing History */}
            <div className='mt-10 mb-10'>
                <h3 className='font-bold text-xl mb-5'>Billing History</h3>
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-6 py-3">Invoice ID</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Plan</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {billingHistory.map((item) => (
                                        <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 font-medium">{item.id}</td>
                                            <td className="px-6 py-4">{item.date}</td>
                                            <td className="px-6 py-4">{item.plan}</td>
                                            <td className="px-6 py-4">{item.amount}</td>
                                            <td className="px-6 py-4">
                                                <span className='text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs font-medium'>{item.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm">Download</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default Billing
