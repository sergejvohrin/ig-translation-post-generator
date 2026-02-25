import { Translation } from "@/types/translation";

const TRANSLATIONS: Translation[] = [
  {
    english: { word: "Sunrise", phrase: "I wake up before sunrise." },
    spanish: { word: "Amanecer", phrase: "Me despierto antes del amanecer." },
    catalan: { word: "Sortida del sol", phrase: "Em desperto abans de la sortida del sol." }
  },
  {
    english: { word: "Journey", phrase: "Every journey starts with one step." },
    spanish: { word: "Viaje", phrase: "Cada viaje empieza con un paso." },
    catalan: { word: "Viatge", phrase: "Cada viatge comenca amb un pas." }
  },
  {
    english: { word: "Friendship", phrase: "Friendship grows with trust." },
    spanish: { word: "Amistad", phrase: "La amistad crece con confianza." },
    catalan: { word: "Amistat", phrase: "L'amistat creix amb confianca." }
  },
  {
    english: { word: "Courage", phrase: "Courage helps us try again." },
    spanish: { word: "Valentia", phrase: "La valentia nos ayuda a intentarlo otra vez." },
    catalan: { word: "Valentia", phrase: "La valentia ens ajuda a tornar-ho a provar." }
  },
  {
    english: { word: "Learning", phrase: "Learning happens every day." },
    spanish: { word: "Aprendizaje", phrase: "El aprendizaje ocurre cada dia." },
    catalan: { word: "Aprenentatge", phrase: "L'aprenentatge passa cada dia." }
  },
  {
    english: { word: "Kindness", phrase: "Kindness can change a moment." },
    spanish: { word: "Amabilidad", phrase: "La amabilidad puede cambiar un momento." },
    catalan: { word: "Amabilitat", phrase: "L'amabilitat pot canviar un moment." }
  },
  {
    english: { word: "Creativity", phrase: "Creativity needs curiosity." },
    spanish: { word: "Creatividad", phrase: "La creatividad necesita curiosidad." },
    catalan: { word: "Creativitat", phrase: "La creativitat necessita curiositat." }
  }
];

export function getRandomTranslation(): Translation {
  const index = Math.floor(Math.random() * TRANSLATIONS.length);
  return TRANSLATIONS[index];
}
