import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { logger } from './logger';

let ai: GoogleGenAI | null = null;

try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    logger.info("Gemini AI successfully initialized");
  } else {
    logger.warn("GEMINI_API_KEY is not set. AI features will run in fallback mode.");
  }
} catch (e) {
  logger.warn("GoogleGenAI initialization failed", { error: e });
}

const intentResponseSchema = z.object({
  intent: z.enum(["greeting", "scheme_query", "unknown"]),
  category: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  source: z.string().nullable().optional()
});

export type IntentResponse = z.infer<typeof intentResponseSchema>;

// Helper function to enforce strict timeouts on promises
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([ 
    promise, 
    timeoutPromise 
  ]).finally(() => clearTimeout(timeoutHandle));
}

/**
 * Parses user input to extract semantic intent and parameters using Gemini.
 */
export async function extractIntentAndParams(message: string): Promise<IntentResponse> {
  if (!ai) {
    return fallbackIntent(message);
  }

  const prompt = `
You are an intent classifier for a government schemes assistant. 
Analyze the user's message and extract the intent and any filter parameters.

Categories available: "Agriculture & Farmers", "Education & Students", "Women & Child Welfare", "Health & Insurance", "Housing & Urban", "Employment & Skill Development", "Senior Citizens & Pension".
States available: "Karnataka", "Maharashtra", "Uttar Pradesh", "Tamil Nadu", "Pan India" (for central).
Source: "Central", "State".

Intents: 
- "greeting": User is saying hello.
- "scheme_query": User is looking for schemes.
- "unknown": Anything else.

Return ONLY a JSON object matching this structure:
{
  "intent": "greeting" | "scheme_query" | "unknown",
  "category": "category name or null",
  "state": "state name or null",
  "source": "Central or State or null"
}

User Message: "${message}"
`;

  try {
    const aiCall = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    // Enforce an 8000ms strict timeout for intent parsing
    const response = await withTimeout(aiCall, 8000);

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return intentResponseSchema.parse(parsed);
    }
  } catch (err) {
    logger.error("Gemini Intent Error", { error: err instanceof Error ? err.message : err });
  }
  return fallbackIntent(message);
}

/**
 * Synthesizes a natural language response grounded in retrieved scheme data.
 */
export async function generateResponse(
  message: string, 
  language: string, 
  schemes: any[]
): Promise<{ response: string | null; suggestedQuestions: string[] }> {
  if (!ai) {
    return { response: null, suggestedQuestions: [] };
  }

  // Cost Control: Pass only top 3 schemes to context to minimize token usage
  const schemesContext = schemes.slice(0, 3).map(s => 
    `- ${s.name}: ${s.description} (Category: ${s.category}, Benefits: ${s.benefits})`
  ).join('\n');

  const prompt = `
You are Bharat Scheme Bot, a helpful and empathetic AI assistant guiding Indian citizens to government welfare schemes.
The user is asking a question in language code: ${language}. You MUST respond in that language.

User Message: "${message}"

Here are the top schemes retrieved from our database that match their profile/query:
${schemesContext || "No schemes found matching the exact criteria, but you can advise them generally or ask for more details."}

Task:
1. Synthesize a friendly, human-readable response that answers the user's query using ONLY the provided schemes context. Do not invent schemes. Format your response cleanly (use paragraphs, lists if needed, but do NOT use markdown headings that are too large). Keep it concise.
2. Generate 3 short follow-up questions the user might want to ask next, also translated to the target language.

Return ONLY a JSON object:
{
  "response": "Your conversational response in the requested language",
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3"]
}
`;

  try {
    const aiCall = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });
    
    // Enforce a 12000ms strict timeout for generation
    const response = await withTimeout(aiCall, 12000);
    
    if (response.text) {
      return JSON.parse(response.text) as { response: string, suggestedQuestions: string[] };
    }
  } catch (err) {
    logger.error("Gemini Generate Error", { error: err instanceof Error ? err.message : err });
  }
  return { response: null, suggestedQuestions: [] };
}

/**
 * Legacy RegEx-based intent detection used as a fallback if the AI key is missing or API fails.
 */
function fallbackIntent(message: string): IntentResponse {
  const text = message.toLowerCase();
  
  // Basic greeting detection
  if (text.match(/\b(hi|hello|hey|namaste|greetings)\b/)) {
    return { intent: "greeting", category: null, state: null, source: null };
  }

  // Keywords map
  const categories = {
    "Agriculture & Farmers": ["farmer", "agriculture", "crop", "tractor", "seed", "kisan"],
    "Education & Students": ["student", "school", "college", "scholarship", "study", "education"],
    "Women & Child Welfare": ["women", "girl", "child", "maternity", "pregnancy", "widow"],
    "Health & Insurance": ["health", "hospital", "medical", "treatment", "disease"],
    "Housing & Urban": ["house", "home", "building", "urban"],
    "Employment & Skill Development": ["job", "employment", "skill", "training", "business", "loan"],
    "Senior Citizens & Pension": ["pension", "old age", "senior citizen", "elderly"]
  };

  const states = {
    "Karnataka": ["karnataka", "bangalore"],
    "Maharashtra": ["maharashtra", "mumbai"],
    "Uttar Pradesh": ["uttar pradesh", "up"],
    "Tamil Nadu": ["tamil nadu", "chennai"]
  };

  const sources = {
    "Central": ["central", "pm", "national", "india"],
    "State": ["state", "local"]
  };

  let matchedCategory = null;
  for (const [cat, words] of Object.entries(categories)) {
    if (words.some(w => text.includes(w))) {
      matchedCategory = cat;
      break;
    }
  }

  let matchedState = null;
  for (const [st, words] of Object.entries(states)) {
    if (words.some(w => text.includes(w))) {
      matchedState = st;
      break;
    }
  }

  let matchedSource = null;
  for (const [src, words] of Object.entries(sources)) {
    if (words.some(w => text.includes(w))) {
      matchedSource = src;
      break;
    }
  }

  if (matchedCategory || matchedState || matchedSource || text.includes("scheme") || text.includes("yojana")) {
    return { 
      intent: "scheme_query", 
      category: matchedCategory, 
      state: matchedState, 
      source: matchedSource 
    };
  }

  return { intent: "unknown", category: null, state: null, source: null };
}
