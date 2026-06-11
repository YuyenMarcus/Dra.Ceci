// Maps app plan ids + billing cycle to Stripe Price IDs, read from function
// secrets so price changes never require a redeploy. Set these with:
//   supabase secrets set STRIPE_PRICE_STARTER_MONTHLY=price_... (etc.)
//
// Only the prices you actually create need to exist; the annual ones are
// optional. The reverse map (priceId -> plan) is used by the webhook to learn
// which tier a subscription is on.

export type PlanId = "starter" | "profesional" | "hacienda";
export type Cycle = "monthly" | "annual";

const PLAN_IDS: PlanId[] = ["starter", "profesional", "hacienda"];
const CYCLES: Cycle[] = ["monthly", "annual"];

function envKey(plan: PlanId, cycle: Cycle) {
  return `STRIPE_PRICE_${plan.toUpperCase()}_${cycle.toUpperCase()}`;
}

export function priceIdFor(plan: PlanId, cycle: Cycle): string | null {
  return Deno.env.get(envKey(plan, cycle)) || null;
}

// Build { priceId -> { plan, cycle } } from whatever secrets are configured.
export function planByPriceId(): Record<string, { plan: PlanId; cycle: Cycle }> {
  const map: Record<string, { plan: PlanId; cycle: Cycle }> = {};
  for (const plan of PLAN_IDS) {
    for (const cycle of CYCLES) {
      const id = Deno.env.get(envKey(plan, cycle));
      if (id) map[id] = { plan, cycle };
    }
  }
  return map;
}

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === "string" && PLAN_IDS.includes(v as PlanId);
}
