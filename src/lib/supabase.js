import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseEnabled = Boolean(url && anonKey);

export const supabase = isSupabaseEnabled ? createClient(url, anonKey) : null;

// Base URL used in auth email links (sign-up confirmation, password reset).
// Defaults to the production deployment so confirmation emails sent from ANY
// environment — including localhost during testing — land on the live app
// instead of a developer's machine. Override per-environment with VITE_SITE_URL
// (e.g. set it to http://localhost:5173 in .env.local for local-only flows).
export const siteUrl = (
  import.meta.env.VITE_SITE_URL || "https://www.clinika.health"
).replace(/\/+$/, "");

export function appUrl(path = "") {
  const suffix = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${siteUrl}${suffix}`;
}
