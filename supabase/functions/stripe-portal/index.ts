// ============================================================================
// stripe-portal — open the Stripe Billing Portal for the signed-in clinic so
// they can update card, change plan, or cancel.
//
// Body: { origin?: string }   Returns: { url }
// Secrets: STRIPE_SECRET_KEY (+ platform-provided SUPABASE_* keys).
// ============================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders, json } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: clinic } = await admin
      .from("clinics")
      .select("id, profile")
      .eq("owner_id", user.id)
      .single();

    const customerId = clinic?.profile?.stripe?.customerId;
    if (!customerId) return json({ error: "No billing customer yet" }, 400);

    const { origin } = await req.json().catch(() => ({ origin: undefined }));
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin || supabaseUrl}/app/settings`,
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("stripe-portal error:", err);
    return json({ error: (err as Error).message || "Portal failed" }, 500);
  }
});
