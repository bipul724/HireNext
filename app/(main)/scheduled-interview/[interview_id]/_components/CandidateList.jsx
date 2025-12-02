import { Button } from "@/components/ui/button";
import moment from "moment";

function CandidateList({candidateList}){
    return(
        <div className="p-5">
            <h2 className="font-bold my-5">Candidates ({candidateList?.length})</h2>
            {candidateList?.map((candidate,index)=>(
                <div key={index} className="p-5 flex gap-3 items-center justify-between bg-white rounded-lg">
                    <div className="flex gap-5 items-center">
                        <h2 className="bg-primary p-3 px-5 text-white font-bold rounded-full">{candidate.userEmail[0]}</h2>
                        <div>
                            <h2 className="font-bold">{candidate?.userName}</h2>
                            <h2 className="text-sm text-gray-500">Completed On: {moment(candidate?.created_at).format("DD MMM YYYY")}</h2>
                        </div>
                    </div>
                    <div className="flex gap-3 items-center">
                        <h2 className="text-green-700">6/10</h2>
                        <Button variant={"outline"} className="text-primary">View Report</Button>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default CandidateList;
