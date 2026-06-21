import { env } from "../config/env.js";

export async function executeCode(language, code) {
  const langMap = {
    'javascript': 'javascript',
    'typescript': 'typescript',
    'python': 'python',
    'java': 'java',
    'cpp': 'c++',
    'c': 'c'
  };

  const payload = {
    language: langMap[language] || language,
    version: '*',
    files: [{ content: code }]
  };

  const response = await fetch(env.PISTON_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Piston API Error: ${response.statusText}`);
  }

  return await response.json();
}
