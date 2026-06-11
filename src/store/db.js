import { supabase, isSupabaseEnabled } from "../lib/supabase.js";

// ---------------------------------------------------------------------------
// Row <-> app-shape mappers
//
// The app historically used `doctorId`/`clientId`; with multi-tenancy the
// tenant is a clinic, so `doctorId` maps to `clinic_id` and `clientId` to
// `patient_id`. Keeping these aliases lets existing components work unchanged.
// ---------------------------------------------------------------------------

export function rowToClinic(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    name: row.name,
    email: row.email,
    specialty: row.specialty,
    clinic: row.clinic_name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    mapQuery: row.map_query,
    workingDays: row.working_days,
    startHour: row.start_hour,
    endHour: row.end_hour,
    slotMinutes: row.slot_minutes,
    profile: row.profile ?? {},
    createdAt: row.created_at,
  };
}

// Map an app-shape clinic patch to DB columns, including ONLY the keys that are
// present. This keeps updateClinic safe for partial patches (e.g. saving just
// the profile) without clobbering untouched columns with defaults.
export function clinicToRow(c) {
  const row = {};
  const set = (key, val) => {
    if (val !== undefined) row[key] = val;
  };
  set("slug", c.slug);
  set("name", c.name);
  set("specialty", c.specialty);
  set("clinic_name", c.clinic);
  set("email", c.email);
  set("phone", c.phone);
  set("address", c.address);
  set("city", c.city);
  set("map_query", c.mapQuery);
  set("working_days", c.workingDays);
  set("start_hour", c.startHour);
  set("end_hour", c.endHour);
  set("slot_minutes", c.slotMinutes);
  set("profile", c.profile);
  return row;
}

function rowToPatient(row) {
  const { name, email, phone, ...data } = row.data || {};
  return {
    id: row.id,
    doctorId: row.clinic_id,
    userId: row.user_id ?? undefined,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at,
    ...data,
  };
}

function patientToRow(clinicId, p) {
  const { id, doctorId, userId, name, email, phone, createdAt, ...data } = p;
  return {
    id,
    clinic_id: clinicId,
    name: name ?? "",
    email: email ?? "",
    phone: phone ?? "",
    data,
  };
}

function rowToInventory(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    sku: row.sku,
    quantity: row.quantity,
    unit: row.unit,
    reorderLevel: row.reorder_level,
    supplier: row.supplier,
    updatedAt: row.updated_at,
  };
}

function inventoryToRow(clinicId, it) {
  return {
    id: it.id,
    clinic_id: clinicId,
    name: it.name,
    category: it.category ?? "",
    sku: it.sku ?? "",
    quantity: Number(it.quantity) || 0,
    unit: it.unit ?? "",
    reorder_level: Number(it.reorderLevel) || 0,
    supplier: it.supplier ?? "",
    updated_at: it.updatedAt ?? new Date().toISOString(),
  };
}

function rowToAppointment(row) {
  return {
    id: row.id,
    doctorId: row.clinic_id,
    locationId: row.location_id ?? undefined,
    clientId: row.patient_id ?? undefined,
    provider: row.provider,
    patientName: row.patient_name ?? undefined,
    patientPhone: row.patient_phone ?? undefined,
    patientEmail: row.patient_email ?? undefined,
    reason: row.reason,
    notes: row.notes,
    start: row.start,
    durationMin: row.duration_min,
    status: row.status,
    source: row.source ?? undefined,
    createdAt: row.created_at,
  };
}

function appointmentToRow(clinicId, a) {
  return {
    id: a.id,
    clinic_id: clinicId,
    location_id: a.locationId ?? null,
    patient_id: a.clientId ?? null,
    provider: a.provider ?? "",
    patient_name: a.patientName ?? null,
    patient_phone: a.patientPhone ?? null,
    patient_email: a.patientEmail ?? "",
    reason: a.reason ?? "",
    notes: a.notes ?? "",
    start: a.start,
    duration_min: Number(a.durationMin) || 30,
    status: a.status ?? "scheduled",
    source: a.source ?? null,
    created_at: a.createdAt ?? new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Clinic (tenant) lookups
// ---------------------------------------------------------------------------

export async function getMyClinic(ownerId) {
  if (!isSupabaseEnabled || !ownerId) return null;
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  return rowToClinic(data);
}

export async function updateClinic(clinicId, patch) {
  if (!isSupabaseEnabled) return;
  const { error } = await supabase
    .from("clinics")
    .update(clinicToRow(patch))
    .eq("id", clinicId);
  if (error) throw error;
}

// A clinic must have been active within this many days to stay listed in the
// public "find a doctor" directory. Clinics that sign up but never come back
// drop off automatically (their activity ages out).
export const ACTIVE_WINDOW_DAYS = 30;

// Stamp the clinic's last-active time so it keeps showing in the directory.
// Merges into the existing profile (the owner's own session is the only writer
// of their profile, so a shallow client-side merge is safe). Best-effort: any
// failure is swallowed so it never interrupts the app.
export async function touchClinicActivity(clinicId, currentProfile = {}) {
  if (!isSupabaseEnabled || !clinicId) return;
  const { error } = await supabase
    .from("clinics")
    .update({ profile: { ...currentProfile, lastActiveAt: new Date().toISOString() } })
    .eq("id", clinicId);
  if (error) console.debug("touchClinicActivity failed:", error.message);
}

// Public directory of clinics for the "find a doctor" page. Returns only the
// non-sensitive marketing fields (no email/phone). Clinics are publicly
// readable, so this works for anonymous visitors and logged-in patients alike.
export async function listClinics() {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase
    .from("clinics")
    .select("id, slug, name, specialty, clinic_name, city, profile, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const cutoff = Date.now() - ACTIVE_WINDOW_DAYS * 86400000;
  return (data ?? [])
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      specialty: row.specialty,
      clinic: row.clinic_name,
      city: row.city,
      profile: row.profile ?? {},
      createdAt: row.created_at,
    }))
    // Hide clinics that have paused their public presence.
    .filter((c) => !c.profile?.suspended)
    // Hide clinics that opted out of the public directory (still reachable by
    // direct link / bookable — this only removes them from "Find a doctor").
    .filter((c) => !c.profile?.unlisted)
    // Hide dormant clinics: they must have been active (or just signed up)
    // within the activity window. Falls back to created_at so brand-new
    // clinics that haven't recorded activity yet still get a grace period.
    .filter((c) => {
      const stamp = c.profile?.lastActiveAt || c.createdAt;
      const ts = stamp ? new Date(stamp).getTime() : NaN;
      return Number.isFinite(ts) ? ts >= cutoff : true;
    });
}

// Public profile by slug (PII-safe RPC).
export async function getClinicBySlug(slug) {
  if (!isSupabaseEnabled || !slug) return null;
  const { data, error } = await supabase.rpc("public_clinic_by_slug", {
    p_slug: slug,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  // RPC returns clinic_name as `clinic_name`; reuse the clinic mapper shape.
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    specialty: row.specialty,
    clinic: row.clinic_name,
    phone: row.phone,
    address: row.address,
    city: row.city,
    mapQuery: row.map_query,
    workingDays: row.working_days,
    startHour: row.start_hour,
    endHour: row.end_hour,
    slotMinutes: row.slot_minutes,
    profile: row.profile ?? {},
  };
}

// Upload a profile photo to the public clinic bucket and return its public URL.
// Files live under "<ownerId>/..." so Storage RLS only lets the owner write.
export async function uploadProfileImage(ownerId, field, file) {
  if (!isSupabaseEnabled) throw new Error("Backend not configured");
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
  const path = `${ownerId}/${field}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("clinic-public")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from("clinic-public").getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Clinic-scoped data for the doctor app
// ---------------------------------------------------------------------------

export async function loadClinicData(clinicId) {
  if (!isSupabaseEnabled || !clinicId) {
    return { inventory: [], clients: [], appointments: [] };
  }
  const [inv, pat, appt] = await Promise.all([
    supabase.from("inventory").select("*").eq("clinic_id", clinicId),
    supabase.from("patients").select("*").eq("clinic_id", clinicId),
    supabase
      .from("appointments")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("start", { ascending: false }),
  ]);
  const err = inv.error || pat.error || appt.error;
  if (err) throw err;
  return {
    inventory: (inv.data ?? []).map(rowToInventory),
    clients: (pat.data ?? []).map(rowToPatient),
    appointments: (appt.data ?? []).map(rowToAppointment),
  };
}

export async function upsertInventoryItem(clinicId, item) {
  if (!isSupabaseEnabled) return;
  const { error } = await supabase
    .from("inventory")
    .upsert(inventoryToRow(clinicId, item));
  if (error) throw error;
}

export async function deleteInventoryItem(id) {
  if (!isSupabaseEnabled) return;
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertPatient(clinicId, patient) {
  if (!isSupabaseEnabled) return;
  const { error } = await supabase
    .from("patients")
    .upsert(patientToRow(clinicId, patient));
  if (error) throw error;
}

export async function deletePatient(id) {
  if (!isSupabaseEnabled) return;
  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertAppointment(clinicId, appointment) {
  if (!isSupabaseEnabled) return;
  const { error } = await supabase
    .from("appointments")
    .upsert(appointmentToRow(clinicId, appointment));
  if (error) throw error;
}

export async function deleteAppointment(id) {
  if (!isSupabaseEnabled) return;
  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Public booking RPCs (used by /c/:slug/book and /c/:slug/manage)
// ---------------------------------------------------------------------------

export async function getTakenSlots(clinicId, fromISO, toISO, locationId = null) {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase.rpc("public_taken_slots", {
    p_clinic_id: clinicId,
    p_from: fromISO,
    p_to: toISO,
    p_location_id: locationId,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    start: r.start,
    durationMin: r.duration_min,
  }));
}

export async function requestAppointmentRpc(params) {
  if (!isSupabaseEnabled) {
    return { ok: false, error: "err.noBackend" };
  }
  const { data, error } = await supabase.rpc("request_appointment", {
    p_clinic_id: params.clinicId,
    p_patient_name: params.patientName,
    p_patient_phone: params.patientPhone,
    p_patient_email: params.patientEmail ?? "",
    p_reason: params.reason ?? "",
    p_notes: params.notes ?? "",
    p_start: params.start,
    p_duration_min: Number(params.durationMin) || 30,
    p_location_id: params.locationId ?? null,
  });
  if (error) return { ok: false, error: "err.bookingFailed" };
  return data;
}

// ---------------------------------------------------------------------------
// Clinic locations (branches) — migration 0019. Managing them is a Profesional+
// feature gated client-side; reads are public via a SECURITY DEFINER RPC.
// ---------------------------------------------------------------------------

function rowToLocation(row) {
  return {
    id: row.id,
    name: row.name ?? "",
    address: row.address ?? "",
    city: row.city ?? "",
    phone: row.phone ?? "",
    mapQuery: row.map_query ?? "",
    lat: typeof row.lat === "number" ? row.lat : null,
    lng: typeof row.lng === "number" ? row.lng : null,
    hours: row.hours ?? "",
    workingDays: row.working_days ?? [1, 2, 3, 4, 5],
    startHour: row.start_hour ?? 9,
    endHour: row.end_hour ?? 17,
    slotMinutes: row.slot_minutes ?? 30,
    sortOrder: row.sort_order ?? 0,
    active: row.active ?? true,
  };
}

// Public: active branches for a clinic (booking picker + public profile).
export async function getClinicLocations(clinicId) {
  if (!isSupabaseEnabled || !clinicId) return [];
  const { data, error } = await supabase.rpc("public_clinic_locations", {
    p_clinic_id: clinicId,
  });
  if (error) {
    console.debug("public_clinic_locations failed:", error.message);
    return [];
  }
  return (data ?? []).map(rowToLocation);
}

// Owner: every branch (incl. inactive) for management.
export async function listMyLocations(clinicId) {
  if (!isSupabaseEnabled || !clinicId) return [];
  const { data, error } = await supabase
    .from("clinic_locations")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToLocation);
}

function locationToRow(clinicId, loc) {
  const row = { clinic_id: clinicId };
  const set = (key, val) => {
    if (val !== undefined) row[key] = val;
  };
  if (loc.id) row.id = loc.id;
  set("name", loc.name?.trim());
  set("address", loc.address?.trim());
  set("city", loc.city?.trim());
  set("phone", loc.phone?.trim());
  set("map_query", loc.mapQuery?.trim());
  set("lat", Number.isFinite(loc.lat) ? loc.lat : null);
  set("lng", Number.isFinite(loc.lng) ? loc.lng : null);
  set("hours", loc.hours?.trim());
  set("working_days", loc.workingDays);
  set("start_hour", loc.startHour);
  set("end_hour", loc.endHour);
  set("slot_minutes", loc.slotMinutes);
  set("sort_order", loc.sortOrder);
  set("active", loc.active);
  return row;
}

export async function saveLocation(clinicId, loc) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { data, error } = await supabase
    .from("clinic_locations")
    .upsert(locationToRow(clinicId, loc))
    .select()
    .single();
  if (error) return { ok: false, error: error.message || "error" };
  return { ok: true, location: rowToLocation(data) };
}

export async function deleteLocation(id) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { error } = await supabase.from("clinic_locations").delete().eq("id", id);
  if (error) return { ok: false, error: error.message || "error" };
  return { ok: true };
}

// Submit an abuse report for a clinic's public profile (anonymous allowed).
export async function reportClinic({ clinicId, reason, details, contact }) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { data, error } = await supabase.rpc("report_clinic", {
    p_clinic_id: clinicId,
    p_reason: reason ?? "",
    p_details: details ?? "",
    p_contact: contact ?? "",
  });
  if (error) return { ok: false, error: "err.reportFailed" };
  return data;
}

// In-app feedback (rating + comment about Clinika) from a logged-in user.
export async function submitTestimonial({ rating, comment }) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { data, error } = await supabase.rpc("submit_testimonial", {
    p_rating: rating,
    p_comment: comment ?? "",
  });
  if (error) return { ok: false, error: "err.feedbackFailed" };
  return data;
}

// The caller's existing testimonial (for prefill), or null.
export async function getMyTestimonial() {
  if (!isSupabaseEnabled) return null;
  const { data, error } = await supabase
    .from("app_testimonials")
    .select("rating, comment, status")
    .maybeSingle();
  if (error) {
    console.debug("getMyTestimonial failed:", error.message);
    return null;
  }
  return data || null;
}

export async function getBookingsByPhone(clinicId, phone) {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase.rpc("public_bookings_by_phone", {
    p_clinic_id: clinicId,
    p_phone: phone,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    reason: r.reason,
    notes: r.notes,
    start: r.start,
    durationMin: r.duration_min,
    status: r.status,
    provider: r.provider,
  }));
}

export async function cancelBookingByPhone(appointmentId, phone) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.cannotCancel" };
  const { data, error } = await supabase.rpc("public_cancel_appointment", {
    p_appointment_id: appointmentId,
    p_phone: phone,
  });
  if (error) return { ok: false, error: "err.cannotCancel" };
  return data;
}

// Permanently delete the signed-in user's account and all of their clinic data
// (handled by ON DELETE CASCADE from auth.users). Requires the
// `delete_my_account` RPC from migration 0005.
export async function deleteMyAccount() {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("Account deletion failed:", error);
    // A missing function shows up as PGRST202 / "Could not find the function".
    // Surface the raw reason so it can be diagnosed without the dev console.
    return {
      ok: false,
      error: "account.deleteFailed",
      detail: error.message || error.hint || error.code || "",
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Patient portal ("all my doctors")
// ---------------------------------------------------------------------------

// Claim any unlinked phone-based records for the logged-in patient. Returns the
// number of records newly linked. Safe to call on every login (idempotent).
export async function linkPatientRecords(phone) {
  if (!isSupabaseEnabled || !phone) return 0;
  const { data, error } = await supabase.rpc("link_my_patient_records", {
    p_phone: phone,
  });
  if (error) {
    console.error("Could not link patient records:", error);
    return 0;
  }
  return data ?? 0;
}

// Whether this account owns any patient records of its own (records linked to
// its auth user). Used to decide if a doctor account is ALSO a patient, which
// unlocks the Doctor <-> Patient portal switcher. RLS (patients_self_read)
// already scopes this to the current user, so it's safe for any role.
export async function countMyPatientRecords(userId) {
  if (!isSupabaseEnabled || !userId) return 0;
  const { count, error } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) {
    console.error("Could not count patient records:", error);
    return 0;
  }
  return count ?? 0;
}

// Load everything a logged-in patient can see: their claimed records, the
// clinics (doctors) behind them, and all their appointments. RLS scopes each
// query to the current auth user automatically.
export async function loadPatientPortal(userId) {
  if (!isSupabaseEnabled || !userId) {
    return { doctors: [], appointments: [], records: [] };
  }

  // Scope strictly to the signed-in user's own patient records. We filter by
  // user_id explicitly because a clinic owner's RLS would otherwise return every
  // patient in their clinic — here we only want records that belong to THEM.
  const { data: patientRows, error: pErr } = await supabase
    .from("patients")
    .select("*")
    .eq("user_id", userId);
  if (pErr) throw pErr;
  const records = (patientRows ?? []).map(rowToPatient);
  const recordIds = records.map((r) => r.id);

  const clinicIds = [...new Set(records.map((r) => r.doctorId).filter(Boolean))];
  let doctors = [];
  if (clinicIds.length) {
    const { data: clinicRows, error: cErr } = await supabase
      .from("clinics")
      .select("*")
      .in("id", clinicIds);
    if (cErr) throw cErr;
    doctors = (clinicRows ?? []).map(rowToClinic);
  }

  let appointments = [];
  if (recordIds.length) {
    const { data: apptRows, error: aErr } = await supabase
      .from("appointments")
      .select("*")
      .in("patient_id", recordIds)
      .order("start", { ascending: false });
    if (aErr) throw aErr;
    appointments = (apptRows ?? []).map(rowToAppointment);
  }

  return { doctors, appointments, records };
}

// ---------------------------------------------------------------------------
// Clinical treatment timeline
// ---------------------------------------------------------------------------

function rowToTreatment(row) {
  return {
    id: row.id,
    doctorId: row.clinic_id,
    clientId: row.patient_id,
    date: row.treatment_date,
    provider: row.provider,
    tooth: row.tooth ?? "",
    procedure: row.procedure,
    followUp: row.follow_up ?? "",
    patientNote: row.patient_note ?? "",
    privateNote: row.private_note ?? "",
    status: row.status ?? "completed",
    amount: Number(row.amount) || 0,
    paid: Boolean(row.paid),
    materials: Array.isArray(row.materials) ? row.materials : [],
    odontogramStatus: row.odontogram_status ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function treatmentToRow(clinicId, t) {
  return {
    id: t.id,
    clinic_id: clinicId,
    patient_id: t.clientId,
    treatment_date: t.date,
    provider: t.provider ?? "",
    tooth: t.tooth || null,
    procedure: t.procedure ?? "",
    follow_up: t.followUp ?? "",
    patient_note: t.patientNote ?? "",
    private_note: t.privateNote ?? "",
    status: t.status ?? "completed",
    amount: Number(t.amount) || 0,
    paid: Boolean(t.paid),
    materials: t.materials ?? [],
    odontogram_status: t.odontogramStatus || null,
    updated_at: new Date().toISOString(),
  };
}

export async function loadTreatments(clinicId, patientId) {
  if (!isSupabaseEnabled || !clinicId || !patientId) return [];
  const { data, error } = await supabase
    .from("treatments")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .order("treatment_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToTreatment);
}

export async function upsertTreatment(clinicId, treatment) {
  if (!isSupabaseEnabled) return;
  const { error } = await supabase
    .from("treatments")
    .upsert(treatmentToRow(clinicId, treatment));
  if (error) throw error;
}

export async function deleteTreatment(id) {
  if (!isSupabaseEnabled) return;
  const { error } = await supabase.from("treatments").delete().eq("id", id);
  if (error) throw error;
}

export async function getMyTreatments() {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase.rpc("my_treatments");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    clinicId: r.clinic_id,
    clinicName: r.clinic_name,
    clinicSlug: r.clinic_slug,
    date: r.treatment_date,
    provider: r.provider,
    tooth: r.tooth,
    procedure: r.procedure,
    followUp: r.follow_up,
    patientNote: r.patient_note,
    status: r.status,
  }));
}

// NOTE: treatments are intentionally NOT exposed by phone to anonymous callers.
// Clinical history is PHI and is only available to an authenticated patient via
// getMyTreatments()/my_treatments() after they link their records (see
// migration 0013_lock_phone_records.sql).

// ---------------------------------------------------------------------------
// Informed consent records
// ---------------------------------------------------------------------------

function rowToConsent(row) {
  return {
    id: row.id,
    doctorId: row.clinic_id,
    clientId: row.patient_id,
    treatmentId: row.treatment_id ?? undefined,
    procedure: row.procedure,
    body: row.body,
    signedName: row.signed_name,
    signedAt: row.signed_at,
  };
}

export async function loadConsents(clinicId, patientId) {
  if (!isSupabaseEnabled || !clinicId || !patientId) return [];
  const { data, error } = await supabase
    .from("consent_records")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .order("signed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToConsent);
}

export async function addConsent(clinicId, record) {
  if (!isSupabaseEnabled) return null;
  const { data, error } = await supabase
    .from("consent_records")
    .insert({
      clinic_id: clinicId,
      patient_id: record.clientId,
      treatment_id: record.treatmentId ?? null,
      procedure: record.procedure ?? "",
      body: record.body ?? "",
      signed_name: record.signedName ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToConsent(data);
}

export async function getMyConsents() {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase.rpc("my_consents");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    clinicId: r.clinic_id,
    clinicName: r.clinic_name,
    clinicSlug: r.clinic_slug,
    procedure: r.procedure,
    body: r.body,
    signedName: r.signed_name,
    signedAt: r.signed_at,
  }));
}

// NOTE: signed consents are intentionally NOT exposed by phone to anonymous
// callers (PHI). They are only available to an authenticated patient via
// getMyConsents()/my_consents() after linking. See migration 0013.

// ---------------------------------------------------------------------------
// Product usage events (migration 0008). Fire-and-forget: never throws, never
// blocks the UI. clinicId is null for patient-portal events.
// ---------------------------------------------------------------------------
export function logEvent(type, meta = {}, clinicId = null) {
  if (!isSupabaseEnabled || !type) return;
  supabase
    .from("app_events")
    .insert({ type, meta, clinic_id: clinicId })
    .then(({ error }) => {
      if (error) console.debug("logEvent failed:", error.message);
    });
}

// ---------------------------------------------------------------------------
// Admin console (cross-tenant, gated server-side by is_admin() in migration 0007)
// ---------------------------------------------------------------------------

// Is the signed-in user an admin? Resolves false on any error so a normal user
// never sees the admin UI even if the RPC is missing.
export async function amIAdmin() {
  if (!isSupabaseEnabled) return false;
  const { data, error } = await supabase.rpc("am_i_admin");
  if (error) return false;
  return Boolean(data);
}

// One row per clinic with the metrics the admin console needs.
export async function adminOverview() {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    ownerEmail: r.owner_email,
    city: r.city,
    createdAt: r.created_at,
    plan: r.plan,
    billing: r.billing,
    suspended: r.suspended,
    trialEndsAt: r.trial_ends_at,
    referralSource: r.referral_source,
    referralCode: r.referral_code || "",
    planCycle: r.plan_cycle,
    lastSignInAt: r.last_sign_in_at,
    patientCount: Number(r.patient_count || 0),
    apptCount: Number(r.appt_count || 0),
    apptThisMonth: Number(r.appt_this_month || 0),
    inventoryCount: Number(r.inventory_count || 0),
    lastEventAt: r.last_event_at,
    lastEventType: r.last_event_type,
    promoUsed: Boolean(r.promo_used),
    promoCode: r.promo_code || "",
  }));
}

// Time-based growth metrics (conversions, churn, new/lost MRR this month).
// Returns null on any error so the dashboard can fall back gracefully.
export async function adminGrowth() {
  if (!isSupabaseEnabled) return null;
  const { data, error } = await supabase.rpc("admin_growth");
  if (error) {
    console.debug("admin_growth failed:", error.message);
    return null;
  }
  return data || null;
}

// Daily time series for the admin charts (signups, activity, MRR movement).
// Returns null on any error so the charts section simply hides.
export async function adminTimeseries(days = 90) {
  if (!isSupabaseEnabled) return null;
  const { data, error } = await supabase.rpc("admin_timeseries", { p_days: days });
  if (error) {
    console.debug("admin_timeseries failed:", error.message);
    return null;
  }
  return data || null;
}

// Shallow-merge a patch into a clinic's profile (plan, billing, trialEndsAt,
// suspended, referralSource, planCycle). Returns { ok, error? }.
export async function adminUpdateClinic(clinicId, patch) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { error } = await supabase.rpc("admin_update_clinic", {
    p_clinic_id: clinicId,
    p_patch: patch,
  });
  if (error) {
    console.error("admin_update_clinic failed:", error);
    return { ok: false, error: error.message || error.code || "error" };
  }
  return { ok: true };
}

// Reports queue (admin only): list flagged clinic profiles.
export async function adminReports() {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase.rpc("admin_reports");
  if (error) {
    console.debug("admin_reports failed:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    clinicId: r.clinic_id,
    clinicName: r.clinic_name,
    clinicSlug: r.clinic_slug,
    reason: r.reason,
    details: r.details,
    reporter: r.reporter,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function adminResolveReport(id, status) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { data, error } = await supabase.rpc("admin_resolve_report", {
    p_id: id,
    p_status: status,
  });
  if (error) return { ok: false, error: error.message || "error" };
  return data;
}

// Testimonials queue (admin only).
export async function adminTestimonials() {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase.rpc("admin_testimonials");
  if (error) {
    console.debug("admin_testimonials failed:", error.message);
    return [];
  }
  return (data ?? []).map((tm) => ({
    id: tm.id,
    clinicId: tm.clinic_id,
    clinicSlug: tm.clinic_slug,
    displayName: tm.display_name,
    rating: tm.rating,
    comment: tm.comment,
    status: tm.status,
    createdAt: tm.created_at,
  }));
}

export async function adminSetTestimonialStatus(id, status) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { data, error } = await supabase.rpc("admin_set_testimonial_status", {
    p_id: id,
    p_status: status,
  });
  if (error) return { ok: false, error: error.message || "error" };
  return data;
}

// ---------------------------------------------------------------------------
// Affiliate / referral codes (migration 0014). Admin-managed; counts and
// commission are computed client-side by grouping clinics on referralCode.
// ---------------------------------------------------------------------------

// Public: look up a referral code for the signup form. Returns its validity and
// the first-month discount (fraction 0..1) it grants.
export async function checkAffiliateCode(code) {
  if (!isSupabaseEnabled || !code) return { valid: false, discountPct: 0 };
  const { data, error } = await supabase.rpc("public_affiliate_info", { p_code: code });
  if (error) {
    console.debug("public_affiliate_info failed:", error.message);
    return { valid: false, discountPct: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.valid) return { valid: false, discountPct: 0 };
  return { valid: true, discountPct: Number(row.discount_pct || 0) };
}

export async function adminAffiliates() {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase.rpc("admin_affiliates");
  if (error) {
    console.debug("admin_affiliates failed:", error.message);
    return [];
  }
  return (data ?? []).map((a) => ({
    code: a.code,
    name: a.name || "",
    commissionPct: Number(a.commission_pct ?? 0.2),
    discountPct: Number(a.discount_pct ?? 0),
    active: a.active,
    createdAt: a.created_at,
  }));
}

export async function adminSaveAffiliate({ code, name, commissionPct, discountPct, active }) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { error } = await supabase.rpc("admin_save_affiliate", {
    p_code: code,
    p_name: name ?? "",
    p_pct: commissionPct ?? 0.2,
    p_discount: discountPct ?? 0,
    p_active: active ?? true,
  });
  if (error) return { ok: false, error: error.message || "error" };
  return { ok: true };
}

export async function adminDeleteAffiliate(code) {
  if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
  const { error } = await supabase.rpc("admin_delete_affiliate", { p_code: code });
  if (error) return { ok: false, error: error.message || "error" };
  return { ok: true };
}

