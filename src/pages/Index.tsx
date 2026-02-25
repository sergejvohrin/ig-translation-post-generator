import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadBase64ToImgBB } from "@/services/imageService";
import { postImageToInstagram } from "@/services/instagramService";
import { getRandomTranslation } from "@/services/translationService";
import { supabase } from "@/lib/supabase";
import { Translation } from "@/types/translation";
import { generateTranslationPostImage } from "@/utils/canvasUtils";

const BACKGROUND_IMAGE = "https://images.pexels.com/photos/457882/pexels-photo-457882.jpeg";

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
  const [isPosting, setIsPosting] = useState(false);

  const isBusy = isGenerating || isPosting;

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
      const image = await generateTranslationPostImage(value, BACKGROUND_IMAGE);
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
      const caption = buildCaption(translation);
      const mediaId = await postImageToInstagram(instagramToken.trim(), imageUrl, caption);

      const { error: logError } = await supabase.from("post_logs").insert({
        en_word: translation.english.word,
        es_word: translation.spanish.word,
        ca_word: translation.catalan.word,
        caption,
        image_url: imageUrl,
        instagram_media_id: mediaId,
        status: "success",
        error_message: null
      });

      if (logError) {
        // Keep posting success UX even if logging is unavailable.
        console.warn("Supabase post_logs insert failed:", logError.message);
      }

      toast.success("Post published successfully to Instagram.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram posting failed.";

      const { error: logError } = await supabase.from("post_logs").insert({
        en_word: translation.english.word,
        es_word: translation.spanish.word,
        ca_word: translation.catalan.word,
        caption: buildCaption(translation),
        image_url: null,
        instagram_media_id: null,
        status: "failed",
        error_message: message
      });

      if (logError) {
        console.warn("Supabase error logging failed:", logError.message);
      }

      toast.error(message);
    } finally {
      setIsPosting(false);
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
