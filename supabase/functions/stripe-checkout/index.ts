// ============================================================================
// stripe-checkout — start a Stripe Checkout session for the signed-in clinic.
//
// Body: { plan: "starter"|"profesional"|"hacienda", cycle?: "monthly"|"annual",
//         origin?: string }
// Returns: { url } to redirect the browser to.
//
// Secrets required (supabase secrets set ...):
//   STRIPE_SECRET_KEY
//   STRIPE_PRICE_<PLAN>_<CYCLE>   (e.g. STRIPE_PRICE_PROFESIONAL_MONTHLY)
// Auto-provided by the platform: SUPABASE_URL, SUPABASE_ANON_KEY,
//   SUPABASE_SERVICE_ROLE_KEY.
// ============================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { corsHeaders, json } from "../_shared/cors.ts";
import { isPlanId, priceIdFor, type Cycle } from "../_shared/plans.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    // User-scoped client to identify the caller.
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { plan, cycle = "monthly", origin } = await req.json();
    if (!isPlanId(plan)) return json({ error: "Invalid plan" }, 400);
    const priceId = priceIdFor(plan, cycle as Cycle);
    if (!priceId) return json({ error: `No price configured for ${plan}/${cycle}` }, 400);

    // Service-role client to read/write the clinic profile (RLS bypass).
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: clinic } = await admin
      .from("clinics")
      .select("id, email, name, profile")
      .eq("owner_id", user.id)
      .single();
    if (!clinic) return json({ error: "No clinic for this account" }, 404);

    const profile = clinic.profile || {};
    let customerId: string | undefined = profile?.stripe?.customerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: clinic.email || user.email || undefined,
        name: clinic.name || undefined,
        metadata: { clinic_id: clinic.id },
      });
      customerId = customer.id;
      await admin
        .from("clinics")
        .update({ profile: { ...profile, stripe: { ...(profile.stripe || {}), customerId } } })
        .eq("id", clinic.id);
    }

    // Referral first-month discount: if this clinic signed up with an affiliate
    // code that grants a discount, apply it as a one-time Stripe coupon (cached
    // on the affiliate row). `discounts` and `allow_promotion_codes` are
    // mutually exclusive in Checkout, so we only allow manual promo codes when
    // no referral discount applies.
    const refCode = String(profile?.referralCode || "").toUpperCase();
    let discounts: { coupon: string }[] | undefined;
    if (refCode) {
      const { data: aff } = await admin
        .from("affiliates")
        .select("code, discount_pct, stripe_coupon_id, active")
        .eq("code", refCode)
        .maybeSingle();
      const pct = Number(aff?.discount_pct || 0);
      if (aff?.active && pct > 0) {
        let couponId = aff.stripe_coupon_id as string | null;
        if (!couponId) {
          const coupon = await stripe.coupons.create({
            percent_off: Math.min(100, Math.max(0, pct * 100)),
            duration: "once",
            name: `Referral ${aff.code}`,
          });
          couponId = coupon.id;
          await admin
            .from("affiliates")
            .update({ stripe_coupon_id: couponId })
            .eq("code", aff.code);
        }
        discounts = [{ coupon: couponId }];
      }
    }

    const base = origin || `${supabaseUrl}`;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: clinic.id,
      line_items: [{ price: priceId, quantity: 1 }],
      ...(discounts ? { discounts } : { allow_promotion_codes: true }),
      success_url: `${base}/app/settings?billing=success`,
      cancel_url: `${base}/app/settings?billing=cancel`,
      metadata: { clinic_id: clinic.id, plan, cycle },
      subscription_data: { metadata: { clinic_id: clinic.id, plan, cycle } },
    });

    return json({ url: session.url });
  } catch (err) {
    console.error("stripe-checkout error:", err);
    return json({ error: (err as Error).message || "Checkout failed" }, 500);
  }
});
