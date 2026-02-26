import axios from "axios";

interface SaveResponse {
  imageUrl: string;
}

interface PublishResponse {
  imageUrl: string;
  postId: string;
  storyId: string;
}

function getSupabaseConfig() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    throw new Error("Missing Supabase URL or publishable key.");
  }

  return { supabaseUrl, publishableKey };
}

function getHeaders(publishableKey: string) {
  return {
    "Content-Type": "application/json",
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`
  };
}

export async function saveGeneratedImageToImgBB(
  imageDataUrl: string,
  imgbbApiKey?: string
): Promise<SaveResponse> {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();

  const response = await axios.post<SaveResponse | { error: string }>(
    `${supabaseUrl}/functions/v1/media-pipeline`,
    {
      action: "save",
      imageDataUrl,
      imgbbApiKey
    },
    {
      headers: getHeaders(publishableKey)
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error);
  }

  return response.data;
}

export async function publishGeneratedImageToInstagram(
  imageDataUrl: string,
  caption: string,
  instagramAccessToken?: string,
  imgbbApiKey?: string
): Promise<PublishResponse> {
  const { supabaseUrl, publishableKey } = getSupabaseConfig();

  const response = await axios.post<PublishResponse | { error: string }>(
    `${supabaseUrl}/functions/v1/media-pipeline`,
    {
      action: "publish_story_post",
      imageDataUrl,
      caption,
      instagramAccessToken,
      imgbbApiKey
    },
    {
      headers: getHeaders(publishableKey)
    }
  );

  if ("error" in response.data) {
    throw new Error(response.data.error);
  }

  return response.data;
}
