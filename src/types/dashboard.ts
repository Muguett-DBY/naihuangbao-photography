export type Booking = {
  id: string;
  package_name: string;
  preferred_date: string;
  preferred_time: string;
  name: string;
  status: string;
  created_at: string;
  payment_intent_id: string | null;
  payment_status: "not_started" | "pending" | "processing" | "succeeded" | "failed" | "cancelled";
  payment_provider: string | null;
  payment_amount_cents: number | null;
  payment_currency: string | null;
};

export type Purchase = {
  id: string;
  item_type: string;
  item_name: string;
  price_cents: number;
  created_at: string;
};

export type Course = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  cover_image_url: string | null;
  progress: number;
  purchased_at: string;
};

export type Workshop = {
  id: string;
  workshop_id: string;
  title: string;
  event_date: string;
  location: string;
  participants: number;
  status: string;
  created_at: string;
};

export type UserPhoto = {
  id: string;
  title: string;
  imageUrl: string;
  style: string;
  delivered_at: string;
};

export type UserProfile = {
  displayName: string;
  email: string;
};
