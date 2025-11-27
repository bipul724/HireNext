import { PhoneIcon, VideoIcon } from "lucide-react"

function CreateOptions(){
    return (
        <div className="grid grid-cols-2 gap-5">
            <div className="bg-white border border-gray-200 p-5 rounded-lg">
                <VideoIcon className="p-3 text-primary bg-blue-50 rounded-lg h-12 w-12"/>
                <h2 className="font-bold">Create New Interview</h2>
                <p className="text-gray-500">Create AI Interviews and schedule them with candidates</p>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-lg">
                <PhoneIcon className="p-3 text-primary bg-blue-50 rounded-lg h-12 w-12"/>
                <h2 className="font-bold">Create Phone Screening Call</h2>
                <p className="text-gray-500">Schedule phone screening calls with candidates</p>
            </div>
        </div>
    )
}

export default CreateOptions
