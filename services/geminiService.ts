import { GoogleGenAI, Type } from "@google/genai";
import { MoodAnalysis, VisualizerMode } from "../types";

// Helper to get the client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeSongMood = async (songName: string, artist?: string): Promise<MoodAnalysis> => {
  const ai = getClient();
  
  const prompt = `
    Analyze the song "${songName}"${artist ? ` by ${artist}` : ''}. 
    Determine its emotional mood, a short description of the vibe, 3 vibrant hex colors (neon or high contrast preferred for dark background) that represent this mood, and the best visualizer style.
    
    The visualizer styles are:
    - BARS: Good for energetic, rhythmic, bass-heavy music.
    - WAVE: Good for calm, acoustic, or classical music.
    - CIRCULAR: Good for electronic, techno, or repetitive beats.
    - ORB: Good for ambient, ethereal, or slow music.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING, description: "One or two words describing the mood (e.g., 'Melancholic', 'High Energy')" },
            description: { type: Type.STRING, description: "A short sentence describing the visual atmosphere." },
            colors: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Array of 3 hex color codes (e.g. ['#FF0000', '#00FF00', '#0000FF'])"
            },
            recommendedMode: { 
              type: Type.STRING, 
              enum: ['BARS', 'WAVE', 'CIRCULAR', 'ORB'],
              description: "The recommended visualizer mode."
            }
          },
          required: ["mood", "description", "colors", "recommendedMode"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return JSON.parse(text) as MoodAnalysis;
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback default
    return {
      mood: "Unknown",
      description: "Could not analyze vibe. Using default settings.",
      colors: ["#6366f1", "#a855f7", "#ec4899"],
      recommendedMode: VisualizerMode.BARS
    };
  }
};