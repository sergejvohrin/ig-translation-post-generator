import axios from "axios";

const CORS_PROXY = "https://cors-anywhere.herokuapp.com/";
const INSTAGRAM_BASE_URL = "https://graph.instagram.com/";
const API_VERSION = "v18.0";

interface CreateMediaContainerResponse {
  id: string;
}

interface PublishMediaResponse {
  id: string;
}

function buildInstagramUrl(path: string): string {
  return `${CORS_PROXY}${INSTAGRAM_BASE_URL}${API_VERSION}${path}`;
}

export async function createMediaContainer(
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const response = await axios.post<CreateMediaContainerResponse>(
    buildInstagramUrl("/me/media"),
    {
      image_url: imageUrl,
      caption,
      access_token: accessToken
    },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.data.id) {
    throw new Error("Instagram media container creation failed.");
  }

  return response.data.id;
}

export async function publishMediaContainer(accessToken: string, creationId: string): Promise<string> {
  const response = await axios.post<PublishMediaResponse>(
    buildInstagramUrl("/me/media_publish"),
    {
      creation_id: creationId,
      access_token: accessToken
    },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.data.id) {
    throw new Error("Instagram publish failed.");
  }

  return response.data.id;
}

export async function postImageToInstagram(
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  if (!accessToken) {
    throw new Error("Instagram access token is required.");
  }

  const creationId = await createMediaContainer(accessToken, imageUrl, caption);
  return publishMediaContainer(accessToken, creationId);
}
