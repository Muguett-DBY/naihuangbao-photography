import { getBookingPolicy } from "../../_booking";
import { jsonResponse } from "../../_responses";

export const onRequestGet: PagesFunction<Env> = async () => {
  return jsonResponse(getBookingPolicy(), 200, { "cache-control": "no-store" });
};
