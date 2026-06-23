export function parseAiResponse(content, fallbackErrorMsg = "No JSON found in AI response") {
    if (!content) {
        throw new Error(fallbackErrorMsg);
    }

    const start = content.indexOf('{');
    const end = content.lastIndexOf('}') + 1;

    if (start === -1 || end === -1 || end <= start) {
        throw new Error(fallbackErrorMsg);
    }

    const jsonString = content.substring(start, end);
    return JSON.parse(jsonString);
}
