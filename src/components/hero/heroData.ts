export type HeroFlower = {
  id: string;
  name: string;
  meaning: string;
  message: string;
  accent: "rose" | "lavender" | "mint";
};

export const heroFlowers: HeroFlower[] = [
  {
    id: "rose",
    name: "Rose",
    meaning: "Love, courage, and words left unsaid.",
    message: "For the feeling I never found the right moment to say.",
    accent: "rose",
  },
  {
    id: "babys-breath",
    name: "Baby's Breath",
    meaning: "Purity, tenderness, and quiet companionship.",
    message: "For the person who stayed softly beside me.",
    accent: "mint",
  },
  {
    id: "lavender",
    name: "Lavender",
    meaning: "Calm, healing, and gentle remembrance.",
    message: "For the days that needed a softer place to rest.",
    accent: "lavender",
  },
];

