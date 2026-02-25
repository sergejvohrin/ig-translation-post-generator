const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json"
    }
  });
}

function toBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function generateImage(word: string, token: string): Promise<{ imageDataUrl: string }> {
  const modelCandidates = [
    Deno.env.get("HF_IMAGE_MODEL"),
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "stabilityai/stable-diffusion-2-1",
    "runwayml/stable-diffusion-v1-5"
  ].filter((value): value is string => Boolean(value && value.trim()));
  const prompt = `realistic photo like image that would be in a theme of Spain and related to ${word}`;
  const errorMessages: string[] = [];

  for (const model of modelCandidates) {
    const hfResponse = await fetch(
      `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(model)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "image/jpeg"
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            guidance_scale: 3.5,
            num_inference_steps: 6,
            width: 1024,
            height: 1024
          }
        })
      }
    );

    if (hfResponse.ok) {
      const contentType = hfResponse.headers.get("content-type") ?? "image/jpeg";
      const bytes = new Uint8Array(await hfResponse.arrayBuffer());
      const base64 = toBase64(bytes);
      return {
        imageDataUrl: `data:${contentType};base64,${base64}`
      };
    }

    const errorBody = await hfResponse.text();
    errorMessages.push(`${model}: ${hfResponse.status} ${errorBody}`);
  }

  throw new Error(`Hugging Face image request failed for all candidate models. ${errorMessages.join(" | ")}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const hfApiToken = Deno.env.get("HF_API_TOKEN");
  if (!hfApiToken) {
    return jsonResponse({ error: "Missing HF_API_TOKEN secret in function environment." }, 500);
  }

  try {
    const payload = (await request.json()) as { word?: string };
    const safeWord = (payload.word ?? "journey").trim().slice(0, 50) || "journey";

    const result = await generateImage(safeWord, hfApiToken);
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backend error";
    return jsonResponse({ error: message }, 500);
  }
});
