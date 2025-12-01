import Image from "next/image";

function InterviewHeader() {
    return (
        <div className="p-4 shadow-sm">
            <Image 
                src="/Logo.png" 
                alt="Logo" 
                width={200} 
                height={100} 
                className="w-[140px]"
            />
        </div>
    );
}

export default InterviewHeader;
