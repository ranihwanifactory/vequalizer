import { GoogleGenAI, Type } from "@google/genai";
import { AIThemeResponse } from '../types';

export class GeminiService {
  private client: GoogleGenAI | null = null;

  constructor() {
    // Initialization is deferred to getClient() to prevent runtime errors 
    // if process.env is not immediately available during module loading.
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return this.client;
  }

  async generateTheme(description: string): Promise<AIThemeResponse | null> {
    try {
      const client = this.getClient();
      const model = "gemini-2.5-flash";
      const prompt = `
        Create a music visualizer theme based on this mood/description: "${description}".
        Suggest a color palette (5 hex codes), a visualizer mode (BARS, WAVE, CIRCLE, PARTICLES), and a short 1 sentence vibe description.
      `;

      const response = await client.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction: "You are a creative UI designer for a music app.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              themeName: { type: Type.STRING },
              colorPalette: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of 5 hex color strings"
              },
              suggestedMode: { 
                type: Type.STRING,
                enum: ["BARS", "WAVE", "CIRCLE", "PARTICLES"]
              },
              vibeDescription: { type: Type.STRING }
            },
            required: ["themeName", "colorPalette", "suggestedMode", "vibeDescription"]
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as AIThemeResponse;
      }
      return null;
    } catch (error) {
      console.error("Gemini API Error:", error);
      return null;
    }
  }
}

export const geminiService = new GeminiService();