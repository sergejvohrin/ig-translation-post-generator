import { Translation } from "@/types/translation";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1080;
const LINE_HEIGHT = 60;

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load background image."));
    img.src = url;
  });
}

function toJpegDataUrl(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  if (!dataUrl.startsWith("data:image/jpeg;base64,")) {
    throw new Error("Image generation failed. Please try again.");
  }
  return dataUrl;
}

export async function generateTranslationPostImage(
  translation: Translation,
  backgroundUrl: string
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not supported in this browser.");
  }

  const image = await loadImage(backgroundUrl);

  ctx.drawImage(image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const lines = [
    `EN: ${translation.english.word}`,
    translation.english.phrase,
    "",
    `ES: ${translation.spanish.word}`,
    translation.spanish.phrase,
    "",
    `CA: ${translation.catalan.word}`,
    translation.catalan.phrase
  ];

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 48px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const textBlockHeight = (lines.length - 1) * LINE_HEIGHT;
  let y = CANVAS_HEIGHT / 2 - textBlockHeight / 2;

  for (const line of lines) {
    ctx.fillText(line, CANVAS_WIDTH / 2, y);
    y += LINE_HEIGHT;
  }

  return toJpegDataUrl(canvas);
}
