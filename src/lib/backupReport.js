// Builds a human-readable, self-contained HTML backup. Opening the file in any
// browser shows clean tables a person can actually read; the SAME file also
// embeds the raw machine-readable snapshot in a <script> tag so it can be
// re-imported to restore the clinic (see parseBackupFile / restoreClinicData).

const MARKER_ID = "clinika-backup-data";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : escapeHtml(iso);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : escapeHtml(iso);
}

function section(title, rows, columns) {
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = (rows || [])
    .map(
      (r) =>
        `<tr>${columns
          .map((c) => `<td>${escapeHtml(c.get(r) ?? "")}</td>`)
          .join("")}</tr>`
    )
    .join("");
  const count = (rows || []).length;
  const empty = `<tr><td colspan="${columns.length}" class="empty">—</td></tr>`;
  return `
  <section>
    <h2>${escapeHtml(title)} <span class="count">${count}</span></h2>
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${body || empty}</tbody>
    </table>
  </section>`;
}

// `L` is a label dictionary supplied by the caller (built from translations).
export function backupToHtml(backup, L) {
  const d = backup.data || {};
  const clinic = backup.clinic || {};
  const clinicName = clinic.clinic_name || clinic.name || "Clinika";

  const patients = section(L.patients, d.patients, [
    { label: L.name, get: (r) => r.name },
    { label: L.phone, get: (r) => r.phone },
    { label: L.email, get: (r) => r.email },
    { label: L.created, get: (r) => fmtDate(r.created_at) },
  ]);

  const appointments = section(L.appointments, d.appointments, [
    { label: L.date, get: (r) => fmtDateTime(r.start) },
    { label: L.patient, get: (r) => r.patient_name },
    { label: L.reason, get: (r) => r.reason },
    { label: L.duration, get: (r) => (r.duration_min ? `${r.duration_min} min` : "") },
    { label: L.status, get: (r) => r.status },
  ]);

  const inventory = section(L.inventory, d.inventory, [
    { label: L.name, get: (r) => r.name },
    { label: L.category, get: (r) => r.category },
    { label: L.quantity, get: (r) => `${r.quantity ?? ""} ${r.unit ?? ""}`.trim() },
    { label: L.reorder, get: (r) => r.reorder_level },
    { label: L.supplier, get: (r) => r.supplier },
  ]);

  const locations = section(L.locations, d.locations, [
    { label: L.name, get: (r) => r.name },
    { label: L.address, get: (r) => [r.address, r.city].filter(Boolean).join(", ") },
    { label: L.phone, get: (r) => r.phone },
    { label: L.hours, get: (r) => r.hours },
    {
      label: L.schedule,
      get: (r) =>
        r.availability && Object.keys(r.availability).length ? L.customSchedule : L.simpleSchedule,
    },
  ]);

  // Clinic-level config that lives inside profile JSONB: bookable services and
  // whether a custom availability schedule is set. (The full raw config is
  // preserved verbatim in the embedded snapshot below.)
  const serviceRows = Array.isArray(clinic.profile?.services) ? clinic.profile.services : [];
  const services = section(L.services, serviceRows, [
    { label: L.name, get: (r) => r.name },
    { label: L.description, get: (r) => r.desc },
    { label: L.duration, get: (r) => (r.durationMin ? `${r.durationMin} min` : "") },
  ]);
  const hasCustomAvailability =
    clinic.profile?.availability && Object.keys(clinic.profile.availability).length > 0;

  const treatments = section(L.treatments, d.treatments, [
    { label: L.date, get: (r) => fmtDate(r.treatment_date) },
    { label: L.patient, get: (r) => r.patient_id },
    { label: L.tooth, get: (r) => r.tooth },
    { label: L.procedure, get: (r) => r.procedure },
    { label: L.status, get: (r) => r.status },
  ]);

  const consents = section(L.consents, d.consents, [
    { label: L.date, get: (r) => fmtDateTime(r.signed_at) },
    { label: L.procedure, get: (r) => r.procedure },
    { label: L.signedBy, get: (r) => r.signed_name },
  ]);

  // The embedded snapshot is HTML-escaped so a stray "</script>" inside the
  // data can't break out of the tag; parseBackupFile un-escapes it.
  const embedded = escapeHtml(JSON.stringify(backup));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(L.title)} — ${escapeHtml(clinicName)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #f8fafc; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 32px 20px 64px; }
  header { border-bottom: 2px solid #14b8a6; padding-bottom: 18px; margin-bottom: 8px; }
  h1 { margin: 0 0 4px; font-size: 24px; }
  .meta { color: #64748b; font-size: 13px; }
  .summary { display: flex; flex-wrap: wrap; gap: 10px; margin: 22px 0 8px; }
  .chip { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; min-width: 96px; }
  .chip b { display: block; font-size: 20px; line-height: 1; }
  .chip span { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #94a3b8; }
  section { margin-top: 30px; }
  h2 { font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  h2 .count { color: #14b8a6; font-size: 13px; margin-left: 6px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; font-size: 13px; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; letter-spacing: .03em; color: #475569; }
  tr:last-child td { border-bottom: none; }
  td.empty { text-align: center; color: #cbd5e1; }
  .note { margin-top: 28px; padding: 14px 16px; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 12px; font-size: 13px; color: #155e63; }
  @media print { body { background: #fff; } .chip, table { border-color: #cbd5e1; } }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${escapeHtml(L.title)}</h1>
      <p class="meta">${escapeHtml(clinicName)} · ${escapeHtml(L.exportedAt)}: ${fmtDateTime(backup.exportedAt)}</p>
      ${hasCustomAvailability ? `<p class="meta">${escapeHtml(L.scheduleIncluded)}</p>` : ""}
    </header>

    <div class="summary">
      <div class="chip"><b>${backup.counts?.patients ?? 0}</b><span>${escapeHtml(L.patients)}</span></div>
      <div class="chip"><b>${backup.counts?.appointments ?? 0}</b><span>${escapeHtml(L.appointments)}</span></div>
      <div class="chip"><b>${backup.counts?.inventory ?? 0}</b><span>${escapeHtml(L.inventory)}</span></div>
      <div class="chip"><b>${backup.counts?.locations ?? 0}</b><span>${escapeHtml(L.locations)}</span></div>
      <div class="chip"><b>${backup.counts?.treatments ?? 0}</b><span>${escapeHtml(L.treatments)}</span></div>
      <div class="chip"><b>${backup.counts?.consents ?? 0}</b><span>${escapeHtml(L.consents)}</span></div>
      <div class="chip"><b>${serviceRows.length}</b><span>${escapeHtml(L.services)}</span></div>
    </div>

    ${patients}
    ${appointments}
    ${treatments}
    ${consents}
    ${inventory}
    ${locations}
    ${services}

    <p class="note">${escapeHtml(L.note)}</p>
  </div>
  <script id="${MARKER_ID}" type="application/json">${embedded}</script>
</body>
</html>`;
}

// Read a backup back out of a file the user uploads. Accepts either the rich
// HTML backup (extracts the embedded snapshot) or a raw .json export.
export async function parseBackupFile(file) {
  const text = await file.text();
  const trimmed = text.trim();

  // Raw JSON export.
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  // HTML backup with an embedded snapshot.
  const match = text.match(
    new RegExp(`<script id="${MARKER_ID}" type="application/json">([\\s\\S]*?)</script>`)
  );
  if (!match) throw new Error("backup.invalidFile");
  const unescaped = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
  return JSON.parse(unescaped);
}
