import axios from "axios";

interface GenerateImageResponse {
  imageDataUrl: string;
}

export async function generateAiSpainBackgroundImage(englishWord: string): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing Supabase URL or publishable key.");
  }

  const response = await axios.post<GenerateImageResponse>(
    `${supabaseUrl}/functions/v1/hf-image`,
    { word: englishWord },
    {
      headers: {
        "Content-Type": "application/json",
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`
      }
    }
  );

  if (!response.data.imageDataUrl?.startsWith("data:image/")) {
    throw new Error("Hugging Face image generation failed.");
  }

  return response.data.imageDataUrl;
}
