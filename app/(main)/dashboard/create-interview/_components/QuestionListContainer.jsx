function QuestionListContainer({questionList}){
    return(
        <div>
            <h2 className="font-bold text-xl mb-4">Interview Questions</h2>
                    <div className="space-y-4">
                        {questionList.map((q, index) => (
                            <div key={index} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
                                <p className="font-medium text-gray-800">{q.question}</p>
                                <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    {q.type}
                                </span>
                            </div>
                        ))}
                    </div>
        </div>
    )
}

export default QuestionListContainer
