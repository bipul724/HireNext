import OpenAI from "openai";

export function getOpenRouterClient() {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("CRITICAL STARTUP ERROR: OPENROUTER_API_KEY is missing from environment variables.");
    }
    
    return new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
    });
}
