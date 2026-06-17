import { galleryItems } from "../src/data/gallery";
import type { PhotoItem, PhotoStyle, PhotoVisibility } from "../src/types/photo";

export type PhotoRow = {
  id: string;
  title: string;
  style: PhotoStyle;
  location: string;
  image_url: string;
  alt: string;
  featured: number;
  client_authorized?: number;
  visibility?: PhotoVisibility;
  album?: string | null;
  video_url?: string | null;
  note_url?: string | null;
  created_at?: string | null;
};

export type PhotoCreateInput = {
  id: string;
  title: string;
  style: PhotoStyle;
  location: string;
  file: File;
  objectKey: string;
  imageUrl: string;
  featured: boolean;
};

export function mapPublicPhoto(row: PhotoRow): PhotoItem {
  return {
    id: row.id,
    title: row.title,
    style: row.style,
    location: row.location,
    imageUrl: row.image_url,
    alt: row.alt,
    featured: row.featured === 1,
    clientAuthorized: row.client_authorized === undefined ? true : row.client_authorized === 1,
    visibility: row.visibility ?? "public",
    album: row.album ?? undefined,
    videoUrl: row.video_url ?? undefined,
    noteUrl: row.note_url ?? undefined,
    createdAt: row.created_at ?? undefined,
  };
}

export function publicPhotosFallback() {
  return galleryItems.map((photo) => ({ ...photo }));
}

const optionalPhotoColumns = ["album", "video_url", "note_url"] as const;

export async function buildPhotoSelectList(env: Env, baseColumns: readonly string[]) {
  try {
    const result = await env.DB.prepare("pragma table_info(photos)").all<{ name: string }>();
    const availableColumns = new Set(result.results.map((column) => column.name));
    const optionalColumns = optionalPhotoColumns.filter((column) => availableColumns.has(column));
    return [...baseColumns, ...optionalColumns].join(", ");
  } catch {
    return baseColumns.join(", ");
  }
}

export async function createPhotoWithCompensation(env: Env, input: PhotoCreateInput) {
  await env.PHOTO_BUCKET.put(input.objectKey, input.file.stream(), {
    httpMetadata: { contentType: input.file.type },
    customMetadata: {
      title: input.title,
      style: input.style,
      location: input.location,
      clientAuthorized: "true",
    },
  });

  try {
    await env.DB.prepare(
      `insert into photos
        (id, title, style, location, object_key, image_url, alt, featured, client_authorized, visibility, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        input.id,
        input.title,
        input.style,
        input.location,
        input.objectKey,
        input.imageUrl,
        `${input.location}${input.title}摄影作品`,
        input.featured ? 1 : 0,
        1,
        "public",
      )
      .run();
  } catch (error) {
    await env.PHOTO_BUCKET.delete(input.objectKey).catch(() => undefined);
    throw error;
  }
}

export async function deletePhotoWithConsistency(env: Env, id: string) {
  const row = await env.DB.prepare("select object_key from photos where id = ?")
    .bind(id)
    .first<{ object_key: string }>();

  if (!row) {
    return { ok: false as const, status: 404, error: "作品不存在" };
  }

  await env.PHOTO_BUCKET.delete(row.object_key);
  await env.DB.prepare("delete from photos where id = ?").bind(id).run();

  return { ok: true as const };
}
