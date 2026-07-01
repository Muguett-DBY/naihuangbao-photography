import { jsonResponse } from "../_responses";

export const onRequestGet: PagesFunction = async () => jsonResponse({
  ok: true,
  status: "healthy",
  service: "naihuangbao-photography",
}, 200, {
  "cache-control": "no-store",
});
