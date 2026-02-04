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

// Constants for timeout management
const TIMEOUT_CONFIG = {
  INITIAL_TIMEOUT: 90000,      // 90 seconds for first attempt
  FALLBACK_TIMEOUT: 75000,     // 75 seconds for fallback
  MINIMAL_TIMEOUT: 60000,      // 60 seconds for minimal content
  CONTENT_LIMITS: {
    HIGH: 12000,
    MEDIUM: 6000,
    LOW: 3000
  }
};

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

// Intelligent content preprocessing
const preprocessContent = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) return content;
  
  // Smart truncation: preserve beginning, sample middle, and end
  const chunkSize = Math.floor(maxLength / 3);
  const beginning = content.slice(0, chunkSize);
  const middleStart = Math.floor(content.length / 2) - Math.floor(chunkSize / 2);
  const middle = content.slice(middleStart, middleStart + chunkSize);
  const end = content.slice(-chunkSize);
  
  return `${beginning}\n\n[... content continues ...]\n\n${middle}\n\n[... more content ...]\n\n${end}`;
};

// Create AbortController-based timeout wrapper
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout after ${timeoutMs}ms (${label})`));
    }, timeoutMs);
    
    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateGameFromContent = async (
    options: GenerateOptions, 
    onProgress?: (stage: string) => void
): Promise<GameData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Define retry strategies with decreasing content size and timeout
  const strategies = [
    { 
      label: "Full Analysis",
      charLimit: TIMEOUT_CONFIG.CONTENT_LIMITS.HIGH,
      timeout: TIMEOUT_CONFIG.INITIAL_TIMEOUT,
      temperature: 0.4
    },
    { 
      label: "Condensed Summary",
      charLimit: TIMEOUT_CONFIG.CONTENT_LIMITS.MEDIUM,
      timeout: TIMEOUT_CONFIG.FALLBACK_TIMEOUT,
      temperature: 0.5
    },
    { 
      label: "Key Concepts",
      charLimit: TIMEOUT_CONFIG.CONTENT_LIMITS.LOW,
      timeout: TIMEOUT_CONFIG.MINIMAL_TIMEOUT,
      temperature: 0.6
    }
  ];

  let lastError: Error | null = null;

  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i];
    
    try {
      if (onProgress) onProgress(i === 0 ? "Analyzing content..." : `Retrying with ${strategy.label.toLowerCase()}...`);
      
      const processedContent = preprocessContent(options.content, strategy.charLimit);
      
      const prompt = `
        You are an expert game designer.
        TASK: Create a ${options.gameMode} game JSON for Learning Objective: "${options.objective}" (${options.objectiveType}).
        
        CONTENT TO BASE QUESTIONS ON:
        ${processedContent}
        
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

      const responsePromise = ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            temperature: strategy.temperature,
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
      });

      const response = await withTimeout(
        responsePromise,
        strategy.timeout,
        strategy.label
      ) as GenerateContentResponse;

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      if (onProgress) onProgress("Finalizing game...");
      return parseGameResponse(response.text, options);

    } catch (error: any) {
        lastError = error;
        console.warn(`Strategy '${strategy.label}' failed:`, error.message);
        
        // Add backoff before next retry if not last attempt
        if (i < strategies.length - 1) {
            const backoffMs = 1500 * (i + 1);
            await delay(backoffMs);
        }
    }
  }

  throw new Error("We couldn't generate a game from this content after multiple attempts. Please try using a shorter document or pasting a summary.");
};