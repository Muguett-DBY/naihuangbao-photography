const verificationCode = "490ec5c1a72a6cfe8f73e1c9b49dd950";

export const onRequest: PagesFunction = async () => {
  return new Response(`${verificationCode}\n`, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
};
