type Env = {
  DB: D1Database;
};

type PhotoRow = {
  id: string;
  title: string;
  style: string;
  location: string;
  image_url: string;
  alt: string;
  featured: number;
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const result = await context.env.DB.prepare(
    `select id, title, style, location, image_url, alt, featured
     from photos
     where client_authorized = 1 and visibility = 'public'
     order by featured desc, created_at desc`,
  ).all<PhotoRow>();

  const photos = result.results.map((row) => ({
    id: row.id,
    title: row.title,
    style: row.style,
    location: row.location,
    imageUrl: row.image_url,
    alt: row.alt,
    featured: row.featured === 1,
    clientAuthorized: true,
    visibility: "public",
  }));

  return new Response(JSON.stringify({ photos }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
