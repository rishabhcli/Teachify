import { GoogleGenAI, Type } from "@google/genai";
import { GameData } from "../types";

export interface GenerateOptions {
  content: string;
  objective: string;
  objectiveType: string;
  gameMode: 'legacy' | 'engine';
  preferredGenre?: string;
  preferredMechanics?: string[];
  avoidMechanics?: string[];
}

const parseGameResponse = (responseText: string, options: GenerateOptions): GameData => {
  try {
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    // Enrich with metadata not from AI
    return {
      ...parsed,
      code: Math.random().toString(36).substring(2, 6).toUpperCase(),
      isEngine: options.gameMode === 'engine'
    } as GameData;
  } catch (e) {
    console.error("Failed to parse game data", e);
    throw new Error("Could not generate a valid game from the content provided.");
  }
};

export const generateGameFromContent = async (options: GenerateOptions): Promise<GameData> => {
  if (!process.env.API_KEY) {
     console.warn("No API Key found. Returning mock data.");
     return {
        code: "TEST",
        isEngine: options.gameMode === 'engine',
        title: "Mock Generated Game",
        description: "A sample game generated without API key.",
        theme: options.preferredGenre as any || "science",
        questions: [
            {
                id: "1",
                text: "What is the powerhouse of the cell?",
                options: ["Nucleus", "Mitochondria", "Ribosome", "Chloroplast"],
                correctIndex: 1,
                explanation: "Mitochondria are responsible for generating most of the cell's supply of adenosine triphosphate (ATP).",
                concept: "Cell Biology",
                misconception: "Some believe the nucleus produces energy."
            }
        ]
     };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    You are an expert educational game designer. 
    Analyze the following lesson content and create a game data structure.
    
    Context:
    - Content: "${options.content.slice(0, 15000)}"
    - Learning Objective: "${options.objective}"
    - Bloom's Taxonomy Level: "${options.objectiveType}"
    - Game Mode: ${options.gameMode}
    ${options.gameMode === 'engine' ? `
    - Preferred Genre: ${options.preferredGenre || "Auto-detect suitable genre"}
    - Mechanics to Include: ${options.preferredMechanics?.join(', ') || "None specified"}
    - Mechanics to Avoid: ${options.avoidMechanics?.join(', ') || "None specified"}
    ` : ''}
    
    Task:
    Create a game that fulfills the learning objective.
    If Game Mode is 'engine', be creative with the title and description to match the genre (e.g., if Economic, use terms like 'Market', 'Trade').
    If Game Mode is 'legacy', stick to a standard quiz format.
    
    Return a JSON object with this schema:
    {
      "title": "A catchy title for the game",
      "description": "A short description",
      "theme": "default" | "adventure" | "science" | "history" | "economic" | "combat" | "spatial" | "social" | "racing" | "puzzle",
      "questions": [
        {
          "id": "unique_id",
          "text": "Question text testing understanding (not just recall)",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0, // 0-3
          "explanation": "Why this is correct",
          "concept": "The key concept being tested",
          "misconception": "A common wrong belief related to this concept"
        }
      ]
    }
    
    Generate at least 5 questions. Make sure options are plausible.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          theme: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
                concept: { type: Type.STRING },
                misconception: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("No content generated");
  }

  return parseGameResponse(response.text, options);
};
