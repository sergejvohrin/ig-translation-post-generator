import axios from "axios";

interface ImgBbUploadResponse {
  data: {
    url: string;
  };
  success: boolean;
}

function stripDataUrlPrefix(base64Image: string): string {
  return base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
}

export async function uploadBase64ToImgBB(base64Image: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error("ImgBB API key is required.");
  }

  const payload = new URLSearchParams();
  payload.append("key", apiKey);
  payload.append("image", stripDataUrlPrefix(base64Image));

  const response = await axios.post<ImgBbUploadResponse>("https://api.imgbb.com/1/upload", payload, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  if (!response.data.success || !response.data.data?.url) {
    throw new Error("Image upload failed. Please check your ImgBB key.");
  }

  return response.data.data.url;
}
