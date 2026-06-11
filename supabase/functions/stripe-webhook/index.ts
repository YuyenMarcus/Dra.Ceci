// ============================================================================
// stripe-webhook — keep clinics.profile in sync with Stripe subscriptions.
//
// IMPORTANT: deploy with JWT verification OFF so Stripe can reach it:
//   supabase functions deploy stripe-webhook --no-verify-jwt
// (also set in supabase/config.toml).
//
// Then add the endpoint in the Stripe Dashboard (Developers → Webhooks):
//   https://<project-ref>.functions.supabase.co/stripe-webhook
// listening for: checkout.session.completed, customer.subscription.updated,
//                customer.subscription.deleted
// and set STRIPE_WEBHOOK_SECRET to the signing secret it gives you.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (+ platform SUPABASE_*).
// ============================================================================
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";
import { planByPriceId } from "../_shared/plans.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Shallow-merge a patch into a clinic's profile, found by id or stripe
// customer. Returns the resolved clinic id (or null) so callers can log a
// billing_event against it.
async function patchProfile(
  match: { clinicId?: string; customerId?: string },
  patch: Record<string, unknown>,
): Promise<string | null> {
  let query = admin.from("clinics").select("id, profile").limit(1);
  if (match.clinicId) query = query.eq("id", match.clinicId);
  else if (match.customerId)
    query = query.eq("profile->stripe->>customerId", match.customerId);
  else return null;

  const { data } = await query.single();
  if (!data) return null;
  const profile = data.profile || {};
  const stripeMeta = { ...(profile.stripe || {}), ...((patch.stripe as object) || {}) };
  await admin
    .from("clinics")
    .update({ profile: { ...profile, ...patch, stripe: stripeMeta } })
    .eq("id", data.id);
  return data.id as string;
}

// Inspect a completed Checkout Session for any redeemed discount (referral
// coupon or a manually-entered promotion code) and return a compact summary
// stored on the clinic profile so the admin console can flag it.
async function readPromo(sessionId: string): Promise<{
  used: boolean;
  code: string | null;
  couponId: string | null;
  amount: number;
  at: string;
}> {
  const at = new Date().toISOString();
  try {
    const full = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["total_details.breakdown", "discounts.promotion_code"],
    });
    const amount = (full.total_details?.amount_discount || 0) / 100;
    const d = (full.discounts && full.discounts[0]) || undefined;
    const couponId = d
      ? typeof d.coupon === "string"
        ? d.coupon
        : d.coupon?.id || null
      : null;
    const pc = d?.promotion_code;
    const promoCode =
      pc && typeof pc !== "string" ? pc.code : typeof pc === "string" ? pc : null;
    const couponName =
      d && typeof d.coupon !== "string" ? d.coupon?.name || null : null;
    const used = amount > 0 || !!couponId || !!promoCode;
    return { used, code: promoCode || couponName || couponId, couponId, amount, at };
  } catch (err) {
    console.error("readPromo failed:", (err as Error).message);
    return { used: false, code: null, couponId: null, amount: 0, at };
  }
}

// Append a row to the billing_events log (growth / churn metrics).
async function logBilling(
  clinicId: string | null,
  type: "subscribed" | "canceled",
  plan: string | undefined,
  amount: number,
) {
  await admin
    .from("billing_events")
    .insert({ clinic_id: clinicId, type, plan: plan || null, amount });
}

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (err) {
    console.error("Webhook signature check failed:", (err as Error).message);
    return new Response("Bad signature", { status: 400 });
  }

  const reverse = planByPriceId();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const metaClinicId = s.client_reference_id || (s.metadata?.clinic_id as string);
        const plan = s.metadata?.plan as string | undefined;
        const cycle = (s.metadata?.cycle as string) || "monthly";

        // Detect whether a referral/promo discount was actually redeemed at
        // checkout (our auto-applied affiliate coupon OR a promo code the user
        // typed in). We re-fetch the session with the discount expanded so we
        // can read the human-readable code and amount.
        const promo = await readPromo(s.id);

        // If the redeemed coupon belongs to one of our affiliate codes, make
        // sure the clinic is attributed to that partner (covers cases where the
        // code wasn't captured at signup).
        let refPatch: Record<string, unknown> = {};
        if (promo.couponId) {
          const { data: aff } = await admin
            .from("affiliates")
            .select("code")
            .eq("stripe_coupon_id", promo.couponId)
            .maybeSingle();
          if (aff?.code) refPatch = { referralCode: aff.code, referralSource: "partner" };
        }

        const clinicId = await patchProfile(
          { clinicId: metaClinicId, customerId: s.customer as string },
          {
            ...(plan ? { plan } : {}),
            planCycle: cycle,
            billing: "stripe",
            suspended: false,
            promo,
            ...refPatch,
            stripe: {
              customerId: s.customer as string,
              subscriptionId: s.subscription as string,
              status: "active",
            },
          },
        );
        await logBilling(clinicId, "subscribed", plan, (s.amount_total || 0) / 100);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id;
        const mapped = priceId ? reverse[priceId] : undefined;
        const active = sub.status === "active" || sub.status === "trialing";
        await patchProfile(
          { customerId: sub.customer as string },
          {
            ...(mapped ? { plan: mapped.plan, planCycle: mapped.cycle } : {}),
            billing: active ? "stripe" : "canceled",
            stripe: { subscriptionId: sub.id, status: sub.status },
          },
        );
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const amount = (sub.items.data[0]?.price?.unit_amount || 0) / 100;
        const priceId = sub.items.data[0]?.price?.id;
        const mapped = priceId ? reverse[priceId] : undefined;
        const clinicId = await patchProfile(
          { customerId: sub.customer as string },
          { billing: "canceled", stripe: { status: "canceled" } },
        );
        await logBilling(clinicId, "canceled", mapped?.plan, amount);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
