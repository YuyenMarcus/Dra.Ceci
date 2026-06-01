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

// Public directory of clinics for the "find a doctor" page. Returns only the
// non-sensitive marketing fields (no email/phone). Clinics are publicly
// readable, so this works for anonymous visitors and logged-in patients alike.
export async function listClinics() {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase
    .from("clinics")
    .select("id, slug, name, specialty, clinic_name, city, profile")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    specialty: row.specialty,
    clinic: row.clinic_name,
    city: row.city,
    profile: row.profile ?? {},
  }));
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

export async function getTakenSlots(clinicId, fromISO, toISO) {
  if (!isSupabaseEnabled) return [];
  const { data, error } = await supabase.rpc("public_taken_slots", {
    p_clinic_id: clinicId,
    p_from: fromISO,
    p_to: toISO,
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
  });
  if (error) return { ok: false, error: "err.bookingFailed" };
  return data;
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

export async function getTreatmentsByPhone(clinicId, phone) {
  if (!isSupabaseEnabled || !clinicId) return [];
  const { data, error } = await supabase.rpc("public_treatments_by_phone", {
    p_clinic_id: clinicId,
    p_phone: phone,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    date: r.treatment_date,
    provider: r.provider,
    tooth: r.tooth,
    procedure: r.procedure,
    followUp: r.follow_up,
    patientNote: r.patient_note,
    status: r.status,
  }));
}

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

export async function getConsentsByPhone(clinicId, phone) {
  if (!isSupabaseEnabled || !clinicId) return [];
  const { data, error } = await supabase.rpc("public_consents_by_phone", {
    p_clinic_id: clinicId,
    p_phone: phone,
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    procedure: r.procedure,
    body: r.body,
    signedName: r.signed_name,
    signedAt: r.signed_at,
  }));
}

