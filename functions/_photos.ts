import { galleryItems } from "../src/data/gallery";
import type { PhotoItem, PhotoStyle, PhotoVisibility } from "../src/types/photo";
import { logWorkerError } from "./_responses";

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

type PhotoDeleteRow = {
  id: string;
  object_key: string;
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
const photoObjectDeleteQueueSchema = `
  create table if not exists photo_object_delete_queue (
    object_key text primary key,
    photo_id text,
    attempts integer not null default 0,
    last_error text,
    created_at text not null default (datetime('now')),
    updated_at text not null default (datetime('now'))
  )
`;
const photoObjectDeleteQueueIndex = `
  create index if not exists idx_photo_object_delete_queue_updated
    on photo_object_delete_queue (updated_at)
`;

function placeholders(count: number) {
  return Array.from({ length: count }, () => "?").join(", ");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500);
}

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

async function ensurePhotoObjectDeleteQueue(env: Env) {
  await env.DB.prepare(photoObjectDeleteQueueSchema).run();
  await env.DB.prepare(photoObjectDeleteQueueIndex).run();
}

async function removeQueuedPhotoObjects(env: Env, objectKeys: string[]) {
  if (objectKeys.length === 0) return;
  await env.DB.prepare(
    `delete from photo_object_delete_queue where object_key in (${placeholders(objectKeys.length)})`,
  )
    .bind(...objectKeys)
    .run();
}

async function recordQueuedPhotoObjectFailure(env: Env, objectKeys: string[], error: unknown) {
  if (objectKeys.length === 0) return;
  await env.DB.prepare(
    `update photo_object_delete_queue
       set attempts = attempts + 1,
           last_error = ?,
           updated_at = datetime('now')
     where object_key in (${placeholders(objectKeys.length)})`,
  )
    .bind(errorMessage(error), ...objectKeys)
    .run();
}

async function deleteQueuedPhotoObjects(env: Env, objectKeys: string[]) {
  if (objectKeys.length === 0) return { cleanupQueued: 0 };

  try {
    await env.PHOTO_BUCKET.delete(objectKeys.length === 1 ? objectKeys[0] : objectKeys);
    await removeQueuedPhotoObjects(env, objectKeys);
    return { cleanupQueued: 0 };
  } catch (error) {
    await recordQueuedPhotoObjectFailure(env, objectKeys, error);
    return { cleanupQueued: objectKeys.length };
  }
}

export async function flushQueuedPhotoObjectDeletes(env: Env, limit = 100) {
  await ensurePhotoObjectDeleteQueue(env);
  const result = await env.DB.prepare(
    `select object_key
       from photo_object_delete_queue
      order by updated_at asc
      limit ?`,
  )
    .bind(limit)
    .all<{ object_key: string }>();
  const objectKeys = result.results.map((row) => row.object_key).filter(Boolean);
  const cleanup = await deleteQueuedPhotoObjects(env, objectKeys);

  return {
    attempted: objectKeys.length,
    cleanupQueued: cleanup.cleanupQueued,
  };
}

async function commitPhotoRowsForDeletion(env: Env, ids: string[], rows: PhotoDeleteRow[]) {
  await ensurePhotoObjectDeleteQueue(env);
  const now = new Date().toISOString();
  await env.DB.batch([
    ...rows.map((row) =>
      env.DB.prepare(
        `insert into photo_object_delete_queue
          (object_key, photo_id, created_at, updated_at)
         values (?, ?, ?, ?)
         on conflict(object_key) do update set
           photo_id = excluded.photo_id,
           updated_at = excluded.updated_at`,
      )
        .bind(row.object_key, row.id, now, now),
    ),
    env.DB.prepare(`delete from photos where id in (${placeholders(ids.length)})`)
      .bind(...ids),
  ]);
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
    await env.PHOTO_BUCKET.delete(input.objectKey).catch((cleanupError) => {
      logWorkerError("上传失败后的 R2 清理失败", cleanupError, { objectKey: input.objectKey });
    });
    throw error;
  }
}

export async function deletePhotoWithConsistency(env: Env, id: string) {
  const row = await env.DB.prepare("select id, object_key from photos where id = ?")
    .bind(id)
    .first<PhotoDeleteRow>();

  if (!row) {
    return { ok: false as const, status: 404, error: "作品不存在" };
  }

  await commitPhotoRowsForDeletion(env, [id], [row]);
  const cleanup = await deleteQueuedPhotoObjects(env, [row.object_key]);

  return { ok: true as const, cleanupQueued: cleanup.cleanupQueued };
}

export async function deletePhotosWithConsistency(env: Env, ids: string[]) {
  const result = await env.DB.prepare(
    `select id, object_key from photos where id in (${placeholders(ids.length)})`,
  )
    .bind(...ids)
    .all<PhotoDeleteRow>();

  const rowsById = new Map(result.results.map((row) => [row.id, row]));
  const rows = ids.map((id) => rowsById.get(id));
  if (rows.some((row) => !row?.object_key)) {
    return {
      ok: false as const,
      status: 409,
      error: "部分作品不存在，请刷新后重试",
    };
  }

  const objectKeys = rows.map((row) => row!.object_key);
  await commitPhotoRowsForDeletion(env, ids, rows as PhotoDeleteRow[]);
  const cleanup = await deleteQueuedPhotoObjects(env, objectKeys);

  return { ok: true as const, deleted: ids.length, ids, cleanupQueued: cleanup.cleanupQueued };
}
