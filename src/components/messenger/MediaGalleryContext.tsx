import { createContext, useContext } from "react";
import type { MediaItem } from "@/components/messenger/MediaViewer";

interface GalleryCtx {
  open: (url: string) => void;
  items: MediaItem[];
}

export const MediaGalleryContext = createContext<GalleryCtx | null>(null);

export function useMediaGallery() {
  return useContext(MediaGalleryContext);
}
