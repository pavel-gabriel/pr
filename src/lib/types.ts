export type Plan = "trial" | "start" | "pro";

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  brand_color: string;
  address: string | null;
  phone: string | null;
  is_published: boolean;
  plan: Plan;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  description_en: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  video_url: string | null;
  allergens: string[];
  is_available: boolean;
  sort_order: number;
}

export type VideoJobStatus = "pending" | "processing" | "done" | "failed";

export interface VideoJob {
  id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  source_image_url: string;
  prompt: string | null;
  status: VideoJobStatus;
  provider_request_id: string | null;
  result_video_url: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export type SeoAuditStatus = "pending" | "running" | "done" | "failed";

export interface SeoCheck {
  id: string;
  label: string;
  passed: boolean;
  /** critical = afectează direct clasarea; warning = de îmbunătățit */
  severity: "critical" | "warning" | "info";
  details: string;
  recommendation?: string;
}

export interface SeoResults {
  finalUrl: string;
  fetchedAt: string;
  responseTimeMs: number;
  checks: SeoCheck[];
  /** Scoruri Lighthouse din PageSpeed Insights (0–100), dacă a fost disponibil */
  lighthouse?: {
    performance?: number;
    seo?: number;
    accessibility?: number;
    bestPractices?: number;
  };
}

export interface SeoAudit {
  id: string;
  url: string;
  email: string;
  status: SeoAuditStatus;
  score: number | null;
  results: SeoResults | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
}

export function formatPrice(cents: number, currency = "RON"): string {
  return `${(cents / 100).toFixed(2).replace(/\.00$/, "")} ${currency === "RON" ? "lei" : currency}`;
}
