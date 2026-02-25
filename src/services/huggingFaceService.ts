import axios from "axios";

import { Translation } from "@/types/translation";

interface GenerateTranslationResponse {
  translation: Translation;
}

const FALLBACK_WORDS = [
  "sunrise",
  "journey",
  "friendship",
  "courage",
  "learning",
  "kindness",
  "creativity",
  "focus",
  "balance"
];

function randomWord(): string {
  const index = Math.floor(Math.random() * FALLBACK_WORDS.length);
  return FALLBACK_WORDS[index];
}

export async function generateAiTranslation(): Promise<Translation> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing Supabase URL or publishable key.");
  }

  const response = await axios.post<GenerateTranslationResponse>(
    `${supabaseUrl}/functions/v1/hf-translation`,
    { word: randomWord() },
    {
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`
      }
    }
  );

  if (!response.data.translation) {
    throw new Error("Hugging Face translation generation failed.");
  }

  return response.data.translation;
}
