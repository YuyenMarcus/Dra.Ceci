import {
  User,
  Stethoscope,
  Activity,
  ClipboardList,
  Phone,
  Mail,
  Cake,
  Smile,
} from "lucide-react";
import { initials, avatarColor } from "../lib/format.js";
import { SISTEMAS, calcEdad, normalizeFicha } from "../lib/ficha.js";
import Odontogram from "./Odontogram.jsx";

function Field({ label, value, className = "" }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
        {value && String(value).trim() ? value : "—"}
      </p>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={15} />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Chip({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
      <Icon size={13} className="text-slate-400" />
      {children}
    </span>
  );
}

export default function FichaView({ client, doctorName }) {
  const f = normalizeFicha(client);
  const edad = calcEdad(f.dob);

  return (
    <div className="ficha-print space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold ${avatarColor(
              f.name
            )}`}
          >
            {initials(f.name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-slate-900">{f.name}</h2>
            <p className="text-sm text-slate-400">
              Ficha clínica{doctorName ? ` · ${doctorName}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip icon={Cake}>{edad != null ? `${edad} años` : null}</Chip>
          <Chip icon={User}>{f.sexo}</Chip>
          <Chip icon={Phone}>{f.phone}</Chip>
          <Chip icon={Mail}>{f.email}</Chip>
        </div>
      </div>

      {/* Datos del paciente */}
      <Section icon={User} title="Datos del paciente">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Field label="Paciente" value={f.name} />
          <Field label="Edad" value={edad != null ? `${edad} años` : ""} />
          <Field label="Sexo" value={f.sexo} />
          <Field label="Teléfono" value={f.phone} />
          <Field label="Ocupación" value={f.ocupacion} />
          <Field label="Referido por" value={f.referidoPor} />
          <Field
            label="Dirección"
            value={f.direccion}
            className="col-span-2 sm:col-span-3"
          />
          <Field
            label="Correo"
            value={f.email}
            className="col-span-2 sm:col-span-3"
          />
          <Field
            label="Enfermedades o padecimientos"
            value={f.enfermedades}
            className="col-span-2 sm:col-span-3"
          />
        </div>
      </Section>

      {/* Historia clínica */}
      <Section icon={Stethoscope} title="Historia clínica">
        <div className="space-y-4">
          <Field label="Historia odontológica" value={f.historiaOdontologica} />
          <Field
            label="Hospitalizaciones, medicamentos, drogas, alergias, etc."
            value={f.hospitalizaciones}
          />
          <Field label="Medicamento de cabecera" value={f.medicamentoCabecera} />
        </div>
      </Section>

      {/* Revisión por sistemas */}
      <Section icon={Activity} title="Revisión por sistemas">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {SISTEMAS.map((s) => {
            const val = f.sistemas[s.key]?.trim();
            return (
              <div
                key={s.key}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                title={s.hint || undefined}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {s.label}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
                  {val || "—"}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Odontograma */}
      <Section icon={Smile} title="Odontograma">
        <Odontogram value={f.odontograma} readOnly />
        {f.odontogramaNotas?.trim() && (
          <div className="mt-4">
            <Field label="Observaciones" value={f.odontogramaNotas} />
          </div>
        )}
      </Section>

      {/* Plan de tratamiento */}
      <Section icon={ClipboardList} title="Plan de tratamiento">
        <Field label="Plan de tratamiento" value={f.planTratamiento} />
      </Section>
    </div>
  );
}
