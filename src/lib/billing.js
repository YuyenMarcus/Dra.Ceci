import { supabase, isSupabaseEnabled } from "./supabase.js";

// Start a Stripe Checkout session for the signed-in clinic and redirect to it.
// `cycle` is "monthly" (default) or "annual". Returns { ok, error? }; on success
// the browser navigates away to Stripe so the caller won't usually see ok.
export async function startCheckout(plan, cycle = "monthly") {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { data, error } = await supabase.functions.invoke("stripe-checkout", {
    body: { plan, cycle, origin: window.location.origin },
  });
  if (error || !data?.url) {
    return { ok: false, error: data?.error || error?.message || "billing.error" };
  }
  window.location.assign(data.url);
  return { ok: true };
}

// Open the Stripe Billing Portal (update card / change plan / cancel).
export async function openBillingPortal() {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { data, error } = await supabase.functions.invoke("stripe-portal", {
    body: { origin: window.location.origin },
  });
  if (error || !data?.url) {
    return { ok: false, error: data?.error || error?.message || "billing.error" };
  }
  window.location.assign(data.url);
  return { ok: true };
}
