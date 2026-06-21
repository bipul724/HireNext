import Logo from "@/components/Logo";
import Link from "next/link";

function InterviewHeader() {
    return (
        <div className="p-4 shadow-sm">
            <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
                <Logo size="md" />
            </Link>
        </div>
    );
}

export default InterviewHeader;
