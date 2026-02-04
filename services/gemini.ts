import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
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
    throw new Error("The AI generated an invalid game format. Please try again.");
  }
};

export const generateGameFromContent = async (options: GenerateOptions): Promise<GameData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Internal helper to attempt generation with specific constraints
  const attemptGeneration = async (charLimit: number, timeoutMs: number, label: string): Promise<GameData> => {
    const truncatedContent = options.content.slice(0, charLimit);
    
    const prompt = `
      You are an expert game designer.
      TASK: Create a ${options.gameMode} game JSON for Learning Objective: "${options.objective}" (${options.objectiveType}).
      
      CONTENT:
      ${truncatedContent}
      
      REQUIREMENTS:
      1. Create EXACTLY 5 questions.
      2. Output JSON only.
      3. Theme: ${options.gameMode === 'engine' ? (options.preferredGenre || "Adventure") : "Quiz"}.
      
      OUTPUT SCHEMA:
      {
        "title": "string",
        "description": "string",
        "theme": "string",
        "questions": [
          {
            "id": "1",
            "text": "Question?",
            "options": ["A", "B", "C", "D"],
            "correctIndex": 0,
            "explanation": "Why?",
            "concept": "Topic",
            "misconception": "Wrong thought"
          }
        ]
      }
    `;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await Promise.race([
            ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    temperature: 0.5, // Lower temperature for faster, more deterministic output
                    thinkingConfig: { thinkingBudget: 0 },
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
            }),
            new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error(`Timeout (${label})`)), timeoutMs)
            )
        ]);
        
        clearTimeout(timeoutId);

        if (response instanceof Error) throw response;
        const typedResponse = response as GenerateContentResponse;
        if (!typedResponse.text) throw new Error("No text generated");

        return parseGameResponse(typedResponse.text, options);

    } catch (error: any) {
        clearTimeout(timeoutId);
        console.warn(`Generation attempt '${label}' failed:`, error.message);
        throw error;
    }
  };

  // ADAPTIVE RETRY STRATEGY
  // 1. Try with good context (15k chars) and generous timeout.
  // 2. If that fails, fallback to condensed context (5k chars) and stricter timeout to recover quickly.
  
  try {
    return await attemptGeneration(15000, 45000, "High Detail");
  } catch (e) {
    try {
        // Fallback: This usually succeeds if the first one timed out due to content length
        return await attemptGeneration(5000, 40000, "Fallback Summary");
    } catch (finalError: any) {
        throw new Error("We couldn't generate a game from this content. Please try using a shorter document or pasting a summary.");
    }
  }
};