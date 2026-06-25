export type PhotoStyle =
  | "jiangnan"
  | "street"
  | "park"
  | "sweet"
  | "couple"
  | "indoor";

export type PhotoVisibility = "public" | "hidden";

export type PhotoItem = {
  id: string;
  title: string;
  style: PhotoStyle;
  location: string;
  imageUrl: string;
  alt: string;
  featured: boolean;
  clientAuthorized: boolean;
  visibility: PhotoVisibility;
  noteUrl?: string;
  album?: string;
  videoUrl?: string;
  createdAt?: string;
  tags?: string[];
};
