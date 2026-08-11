import { jsonResponse } from "../../_responses";

export const onRequestPost: PagesFunction<Env> = async () => jsonResponse(
  { error: "Direct notification delivery is disabled; notifications are created by verified server transactions." },
  410,
  { "cache-control": "no-store" },
);
