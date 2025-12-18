"use client"
import { Button } from "@/components/ui/button";
import Image from "next/image";
// import Logo from "@/public/Logo.png";
import { supabase } from "@/services/supabaseClient";

export default function Login() {
    const signInWithGoogle = async () => {
        const { data, error } = supabase.auth.signInWithOAuth({
            provider: 'google',
        });

        if(error) {
            console.log("Error", error.message)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <div className="flex flex-col items-center border rounded-2xl p-8">
                <Image
                    src="/Logo.png"
                    alt="Logo"
                    width={400}
                    height={100}
                    className="w-[180px]"
                />
                <div className="flex flex-col items-center  ">
                    <Image
                        src="/login.png"
                        alt="Login"
                        width={600}
                        height={400}
                        className="w-[400px] h-[250px] rounded-2xl"
                    />
                    <h2 className="text-2xl font-bold text-center mt-5">Welcome to AiCruiter</h2>
                    <p className="text-gray-500 text-center">Sign in to your account</p>
                    <Button className="mt-7 w-full"
                    onClick={signInWithGoogle}>Login with Google</Button>
                </div>
            </div>
        </div>
    )
}
