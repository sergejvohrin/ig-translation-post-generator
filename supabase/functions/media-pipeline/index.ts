const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

interface SaveRequest {
  action: "save";
  imageDataUrl: string;
  imgbbApiKey?: string;
}

interface PublishRequest {
  action: "publish_story_post";
  imageDataUrl: string;
  caption: string;
  imgbbApiKey?: string;
  instagramAccessToken?: string;
}

type RequestBody = SaveRequest | PublishRequest;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json"
    }
  });
}

function stripDataUrlPrefix(base64Image: string): string {
  return base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
}

async function uploadToImgBB(base64Image: string, apiKey: string): Promise<string> {
  const body = new URLSearchParams();
  body.append("key", apiKey);
  body.append("image", stripDataUrlPrefix(base64Image));

  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const payload = (await response.json()) as {
    success?: boolean;
    data?: { url?: string };
    error?: { message?: string };
  };

  if (!response.ok || !payload.success || !payload.data?.url) {
    throw new Error(payload.error?.message ?? "ImgBB upload failed.");
  }

  return payload.data.url;
}

async function createInstagramContainer(
  igUserId: string,
  token: string,
  imageUrl: string,
  caption: string,
  mediaType: "IMAGE" | "STORIES"
): Promise<string> {
  const payload: Record<string, string> = {
    image_url: imageUrl,
    access_token: token
  };

  if (mediaType === "STORIES") {
    payload.media_type = "STORIES";
  } else {
    payload.caption = caption;
  }

  const response = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as { id?: string; error?: { message?: string } };
  if (!response.ok || !data.id) {
    throw new Error(data.error?.message ?? "Instagram media container creation failed.");
  }

  return data.id;
}

async function publishInstagramContainerForUser(
  igUserId: string,
  token: string,
  creationId: string
): Promise<string> {
  const response = await fetch(`https://graph.facebook.com/v18.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: token
    })
  });

  const data = (await response.json()) as { id?: string; error?: { message?: string } };
  if (!response.ok || !data.id) {
    throw new Error(data.error?.message ?? "Instagram publish failed.");
  }

  return data.id;
}

async function resolveInstagramBusinessAccountId(token: string): Promise<string> {
  const configuredId = (Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID") ?? "").trim();
  if (configuredId) {
    return configuredId;
  }

  const pagesResponse = await fetch(
    `https://graph.facebook.com/v18.0/me/accounts?access_token=${encodeURIComponent(token)}`
  );
  const pagesData = (await pagesResponse.json()) as {
    data?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!pagesResponse.ok) {
    throw new Error(pagesData.error?.message ?? "Failed to load Facebook pages.");
  }

  for (const page of pagesData.data ?? []) {
    if (!page.id) {
      continue;
    }

    const pageResponse = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${encodeURIComponent(
        token
      )}`
    );
    const pagePayload = (await pageResponse.json()) as {
      instagram_business_account?: { id?: string };
    };

    const igId = pagePayload.instagram_business_account?.id;
    if (igId) {
      return igId;
    }
  }

  throw new Error(
    "No Instagram business account found for this token. Ensure your Instagram Professional account is linked to a Facebook Page and the token has pages_show_list + instagram_content_publish."
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await request.json()) as RequestBody;

    if (!body.imageDataUrl?.startsWith("data:image/")) {
      return jsonResponse({ error: "Invalid image payload." }, 400);
    }

    const fallbackImgBbKey = Deno.env.get("IMGBB_API_KEY") ?? "";
    const imgbbApiKey = (body.imgbbApiKey ?? fallbackImgBbKey).trim();
    if (!imgbbApiKey) {
      return jsonResponse({ error: "Missing IMGBB_API_KEY secret (or runtime key)." }, 500);
    }

    const imageUrl = await uploadToImgBB(body.imageDataUrl, imgbbApiKey);

    if (body.action === "save") {
      return jsonResponse({ imageUrl });
    }

    const fallbackInstagramToken = Deno.env.get("INSTAGRAM_ACCESS_TOKEN") ?? "";
    const instagramToken = (body.instagramAccessToken ?? fallbackInstagramToken).trim();
    if (!instagramToken) {
      return jsonResponse({ error: "Missing INSTAGRAM_ACCESS_TOKEN secret (or runtime token)." }, 500);
    }

    const caption = body.caption ?? "";
    const igUserId = await resolveInstagramBusinessAccountId(instagramToken);

    const postCreationId = await createInstagramContainer(igUserId, instagramToken, imageUrl, caption, "IMAGE");
    const storyCreationId = await createInstagramContainer(igUserId, instagramToken, imageUrl, "", "STORIES");

    const postId = await publishInstagramContainerForUser(igUserId, instagramToken, postCreationId);
    const storyId = await publishInstagramContainerForUser(igUserId, instagramToken, storyCreationId);

    return jsonResponse({
      imageUrl,
      postId,
      storyId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backend error";
    return jsonResponse({ error: message }, 500);
  }
});
