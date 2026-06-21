"use client";

import React, { useEffect, useState } from "react";
import DashboardProvider from "./provider";
import { supabase } from "@/services/supabaseClient";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function DashboardLayout({ children }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setIsAuthenticated(true);
                } else {
                    router.replace("/auth");
                }
            } catch (error) {
                console.error("Auth check error:", error);
                router.replace("/auth");
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                router.replace("/auth");
            } else if (session?.user) {
                setIsAuthenticated(true);
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-secondary flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="bg-secondary">
            <DashboardProvider>
                <div>
                    {children}
                </div>
            </DashboardProvider>
        </div>
    );
}

export default DashboardLayout;
