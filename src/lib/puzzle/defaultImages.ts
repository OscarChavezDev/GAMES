export type DefaultImage = {
  id: string;
  label: string;
  author: string;
  url: string;
  width: number;
  height: number;
};

/**
 * Curated gallery of default puzzle images, served via Lorem Picsum
 * (picsum.photos/id/{id} always returns the exact same photo, so these are
 * stable). Each entry's width/height matches the source photo's aspect
 * ratio closely so Picsum doesn't need to crop it.
 */
export const DEFAULT_IMAGES: DefaultImage[] = [
  { id: "28", label: "Imagen 1", author: "Jerry Adney", url: "https://picsum.photos/id/28/1600/1060", width: 1600, height: 1060 },
  { id: "29", label: "Imagen 2", author: "Go Wild", url: "https://picsum.photos/id/29/1600/1068", width: 1600, height: 1068 },
  { id: "62", label: "Imagen 3", author: "Daniel Genser", url: "https://picsum.photos/id/62/1600/1066", width: 1600, height: 1066 },
  { id: "63", label: "Imagen 4", author: "Justin Leibow", url: "https://picsum.photos/id/63/1600/900", width: 1600, height: 900 },
  { id: "71", label: "Imagen 5", author: "Jon Eckert", url: "https://picsum.photos/id/71/1600/1067", width: 1600, height: 1067 },
  { id: "80", label: "Imagen 6", author: "Sonja Langford", url: "https://picsum.photos/id/80/1600/1067", width: 1600, height: 1067 },
  { id: "81", label: "Imagen 7", author: "Sander Weeteling", url: "https://picsum.photos/id/81/1600/1040", width: 1600, height: 1040 },
  { id: "90", label: "Imagen 8", author: "Rula Sibai", url: "https://picsum.photos/id/90/1600/1062", width: 1600, height: 1062 },
];

export function getDefaultImage(id: string): DefaultImage | undefined {
  return DEFAULT_IMAGES.find((img) => img.id === id);
}

/** Smaller Picsum render of the same photo, for gallery thumbnails. */
export function defaultImageThumbUrl(img: DefaultImage, targetWidth = 320): string {
  const targetHeight = Math.round(targetWidth * (img.height / img.width));
  return `https://picsum.photos/id/${img.id}/${targetWidth}/${targetHeight}`;
}
