const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

interface Translation {
  english: { word: string; phrase: string };
  spanish: { word: string; phrase: string };
  catalan: { word: string; phrase: string };
}

interface HuggingFaceModelListResponse {
  data?: Array<{ id: string }>;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json"
    }
  });
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function assertTranslationShape(value: unknown): asserts value is Translation {
  const candidate = value as Translation;
  const valid =
    candidate?.english?.word &&
    candidate?.english?.phrase &&
    candidate?.spanish?.word &&
    candidate?.spanish?.phrase &&
    candidate?.catalan?.word &&
    candidate?.catalan?.phrase;

  if (!valid) {
    throw new Error("Invalid translation payload from Hugging Face.");
  }
}

async function resolveModel(token: string): Promise<string> {
  const preferred = [
    Deno.env.get("HF_MODEL"),
    "Qwen/Qwen2.5-Coder-7B-Instruct",
    "Qwen/Qwen2.5-7B-Instruct",
    "deepseek-ai/DeepSeek-R1:fastest"
  ].filter((value): value is string => Boolean(value && value.trim()));

  const response = await fetch("https://router.huggingface.co/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to list Hugging Face models (${response.status}).`);
  }

  const data = (await response.json()) as HuggingFaceModelListResponse;
  const available = new Set((data.data ?? []).map((model) => model.id));

  for (const candidate of preferred) {
    if (available.has(candidate)) {
      return candidate;
    }
  }

  const firstAvailable = data.data?.[0]?.id;
  if (!firstAvailable) {
    throw new Error("No available Hugging Face router models found for this token.");
  }

  return firstAvailable;
}

async function generateTranslation(word: string, token: string): Promise<Translation> {
  const model = await resolveModel(token);
  const prompt = [
    "Return only valid JSON without markdown or explanation.",
    "Schema:",
    '{"english":{"word":"","phrase":""},"spanish":{"word":"","phrase":""},"catalan":{"word":"","phrase":""}}',
    `Input word: ${word}`,
    "Task: Translate the word and generate one short, natural example phrase in each language."
  ].join("\n");

  const hfResponse = await fetch("https://router.huggingface.co/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 320,
      temperature: 0.2
    })
  });

  if (!hfResponse.ok) {
    const errorBody = await hfResponse.text();
    throw new Error(`Hugging Face request failed (${hfResponse.status}): ${errorBody}`);
  }

  const data = (await hfResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const generatedText = data.choices?.[0]?.message?.content ?? "";
  const extracted = extractJsonObject(generatedText);

  if (!extracted) {
    throw new Error("No JSON output returned by Hugging Face.");
  }

  const parsed = JSON.parse(extracted);
  assertTranslationShape(parsed);
  return parsed;
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
    const inputWord = (payload.word ?? "journey").trim();
    const safeWord = inputWord.slice(0, 40) || "journey";

    const translation = await generateTranslation(safeWord, hfApiToken);
    return jsonResponse({ translation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backend error";
    return jsonResponse({ error: message }, 500);
  }
});
