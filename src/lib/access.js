// ---------------------------------------------------------------------------
// Trial / subscription access state — single source of truth for the paywall.
//
// New clinics get a 14-day free trial (profile.trialEndsAt, stamped by the
// handle_new_user trigger — see 0007_admin.sql). When the trial ends they enter
// a short GRACE_HOURS grace period: the app keeps working but warns them to
// subscribe. After the grace period ends, the doctor app is locked until they
// start a subscription.
//
// NOTE: this is a client-side gate (it controls UI/routing only, exactly like
// reception mode). It is not a database access boundary — a determined user
// could still hit the API directly. Server-side enforcement (RLS that checks
// trial/billing) would be a separate, larger change.
// ---------------------------------------------------------------------------

export const TRIAL_DAYS = 14;
export const GRACE_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// True when the clinic has an active subscription (real Stripe billing) or an
// admin-comped plan (billing === "manual"). The webhook only sets
// billing === "stripe" while the subscription is active/trialing, and flips it
// to "canceled" otherwise, so that flag is authoritative.
export function subscriptionActive(profile) {
  if (!profile) return false;
  if (profile.billing === "manual") return true;
  if (profile.billing === "stripe") return true;
  const status = profile.stripe?.status;
  return status === "active" || status === "trialing";
}

// Resolve the access state from a clinic profile.
// Returns one of:
//   { state: "subscribed" }                         — full access, no nag
//   { state: "trial", daysLeft, trialEndsAt, lockAt }
//   { state: "grace", hoursLeft, trialEndsAt, lockAt }
//   { state: "locked", trialEndsAt, lockAt }          — paywall
// `daysLeft` is whole days left in the trial; `hoursLeft` is whole hours left in
// the grace window (both >= 1 while active).
export function trialAccess(profile, now = Date.now()) {
  if (subscriptionActive(profile)) return { state: "subscribed" };

  const raw = profile?.trialEndsAt;
  const end = raw ? new Date(raw).getTime() : NaN;
  // No/invalid trial stamp (e.g. legacy accounts created before trials existed):
  // don't lock them out on a missing field — treat as fine.
  if (!Number.isFinite(end)) return { state: "subscribed" };

  const lockAt = end + GRACE_HOURS * HOUR_MS;

  if (now < end) {
    return {
      state: "trial",
      daysLeft: Math.max(1, Math.ceil((end - now) / DAY_MS)),
      trialEndsAt: end,
      lockAt,
    };
  }
  if (now < lockAt) {
    return {
      state: "grace",
      hoursLeft: Math.max(1, Math.ceil((lockAt - now) / HOUR_MS)),
      trialEndsAt: end,
      lockAt,
    };
  }
  return { state: "locked", trialEndsAt: end, lockAt };
}
