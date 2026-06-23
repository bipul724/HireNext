"use client";
import Logo from "@/components/Logo";
import Link from "next/link";
import { usePathname } from "next/navigation";

function InterviewHeader() {
    const pathname = usePathname();

    // The live interview screen (/start) renders its own unified header that
    // already includes the brand, so we hide this generic bar there to avoid a
    // duplicated, stacked header. It still shows on the lobby/completed pages.
    if (pathname?.endsWith("/start")) return null;

    return (
        <div className="px-4 md:px-8 py-3.5 border-b border-slate-100 bg-white/70 backdrop-blur-sm">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                <Logo size="md" />
            </Link>
        </div>
    );
}

export default InterviewHeader;
