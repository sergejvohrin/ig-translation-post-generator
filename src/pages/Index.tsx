import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadBase64ToImgBB } from "@/services/imageService";
import { postImageToInstagram } from "@/services/instagramService";
import { generateAiSpainBackgroundImage } from "@/services/huggingFaceImageService";
import { generateAiTranslation } from "@/services/huggingFaceService";
import { getRandomTranslation } from "@/services/translationService";
import { Translation } from "@/types/translation";
import { generateTranslationPostImage } from "@/utils/canvasUtils";

const FALLBACK_BACKGROUND_IMAGE = "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg";

function buildCaption(translation: Translation): string {
  return [
    `EN: ${translation.english.word} - ${translation.english.phrase}`,
    `ES: ${translation.spanish.word} - ${translation.spanish.phrase}`,
    `CA: ${translation.catalan.word} - ${translation.catalan.phrase}`,
    "#languages #english #spanish #catalan"
  ].join("\n");
}

export function IndexPage() {
  const [instagramToken, setInstagramToken] = useState("");
  const [imgBbApiKey, setImgBbApiKey] = useState("");
  const [translation, setTranslation] = useState<Translation>(() => getRandomTranslation());
  const [previewImage, setPreviewImage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAiWord, setIsGeneratingAiWord] = useState(false);
  const [isSavingToImgBb, setIsSavingToImgBb] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const isBusy = isGenerating || isGeneratingAiWord || isSavingToImgBb || isPosting;

  const sections = useMemo(
    () => [
      {
        label: "English",
        word: translation.english.word,
        phrase: translation.english.phrase
      },
      {
        label: "Spanish",
        word: translation.spanish.word,
        phrase: translation.spanish.phrase
      },
      {
        label: "Catalan",
        word: translation.catalan.word,
        phrase: translation.catalan.phrase
      }
    ],
    [translation]
  );

  const generateImage = async (value: Translation) => {
    setIsGenerating(true);
    try {
      let backgroundImage = FALLBACK_BACKGROUND_IMAGE;

      try {
        backgroundImage = await generateAiSpainBackgroundImage(value.english.word);
      } catch (error) {
        const message = error instanceof Error ? error.message : "AI background generation failed.";
        toast.error(`${message} Using fallback background image.`);
      }

      const image = await generateTranslationPostImage(value, backgroundImage);
      setPreviewImage(image);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate preview image.";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    void generateImage(translation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation]);

  const handleNewWord = () => {
    setTranslation(getRandomTranslation());
  };

  const handleAiWord = async () => {
    setIsGeneratingAiWord(true);
    try {
      const aiTranslation = await generateAiTranslation();
      setTranslation(aiTranslation);
      toast.success("Generated new AI translation.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI translation generation failed.";
      toast.error(message);
    } finally {
      setIsGeneratingAiWord(false);
    }
  };

  const handlePostToInstagram = async () => {
    if (!instagramToken.trim() || !imgBbApiKey.trim()) {
      toast.error("Missing API credentials. Add Instagram token and ImgBB API key.");
      return;
    }

    if (!previewImage) {
      toast.error("Preview image is not ready yet. Please wait.");
      return;
    }

    setIsPosting(true);
    try {
      const imageUrl = await uploadBase64ToImgBB(previewImage, imgBbApiKey.trim());
      await postImageToInstagram(instagramToken.trim(), imageUrl, buildCaption(translation));
      toast.success("Post published successfully to Instagram.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram posting failed.";
      toast.error(message);
    } finally {
      setIsPosting(false);
    }
  };

  const handleSaveToImgBb = async () => {
    if (!imgBbApiKey.trim()) {
      toast.error("Missing ImgBB API key.");
      return;
    }

    if (!previewImage) {
      toast.error("Preview image is not ready yet. Please wait.");
      return;
    }

    setIsSavingToImgBb(true);
    try {
      const imageUrl = await uploadBase64ToImgBB(previewImage, imgBbApiKey.trim());
      toast.success("Image saved to ImgBB.", {
        action: {
          label: "Open",
          onClick: () => window.open(imageUrl, "_blank", "noopener,noreferrer")
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Saving to ImgBB failed.";
      toast.error(message);
    } finally {
      setIsSavingToImgBb(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Multilingual Instagram Post Generator</CardTitle>
          <CardDescription>
            Generate random English, Spanish, and Catalan translation posts and publish directly to Instagram.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instagram-token">Instagram Access Token</Label>
              <Input
                id="instagram-token"
                type="password"
                placeholder="Paste access token"
                value={instagramToken}
                onChange={(event) => setInstagramToken(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imgbb-api-key">ImgBB API Key</Label>
              <Input
                id="imgbb-api-key"
                type="password"
                placeholder="Paste ImgBB API key"
                value={imgBbApiKey}
                onChange={(event) => setImgBbApiKey(event.target.value)}
              />
            </div>

            <div className="grid gap-3">
              {sections.map((section) => (
                <div key={section.label} className="rounded-md border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{section.label}</p>
                  <p className="mt-1 text-xl font-bold">{section.word}</p>
                  <p className="mt-1 text-sm text-slate-700">{section.phrase}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleNewWord} disabled={isBusy}>
                New Word
              </Button>
              <Button onClick={handleAiWord} disabled={isBusy} variant="secondary">
                {isGeneratingAiWord ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "AI Word"
                )}
              </Button>
              <Button onClick={handleSaveToImgBb} disabled={isBusy || !previewImage} variant="secondary">
                {isSavingToImgBb ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save to ImgBB"
                )}
              </Button>
              <Button onClick={handlePostToInstagram} disabled={isBusy || !previewImage}>
                {isPosting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post to Instagram"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Live Preview</p>
            <div className="overflow-hidden rounded-lg border bg-slate-200">
              {previewImage ? (
                <img src={previewImage} alt="Generated translation post preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-[400px] items-center justify-center text-sm text-slate-600">
                  {isGenerating ? "Generating image..." : "Preview not available."}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
