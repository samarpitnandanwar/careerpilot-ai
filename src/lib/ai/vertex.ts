// ============================================================================
// CareerPilot AI — Vertex AI Gemini Service
// ============================================================================

import { VertexAI, type GenerativeModel } from "@google-cloud/vertexai";

const PROJECT_ID = process.env.NEXT_PUBLIC_GCP_PROJECT_ID ?? "careerpilot-ai-506813";
const LOCATION = process.env.GEMINI_LOCATION ?? "us-central1";
const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-2.0-flash-001";

let _vertexAI: VertexAI | null = null;
let _model: GenerativeModel | null = null;

function getVertexAI(): VertexAI {
  if (_vertexAI) return _vertexAI;
  _vertexAI = new VertexAI({
    project: PROJECT_ID,
    location: LOCATION,
  });
  return _vertexAI;
}

export function getGeminiModel(): GenerativeModel {
  if (_model) return _model;
  const vertexAI = getVertexAI();
  _model = vertexAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });
  return _model;
}

export async function generateContent(prompt: string): Promise<string> {
  const model = getGeminiModel();
  const result = await model.generateContent(prompt);
  const response = result.response;

  if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new GeminiError("No response from Gemini model", "NO_RESPONSE");
  }

  return response.candidates[0].content.parts[0].text;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export function getModelInfo() {
  return { project: PROJECT_ID, location: LOCATION, model: MODEL_NAME };
}
