import { SISTEMAS } from "../lib/ficha.js";
import Odontogram from "./Odontogram.jsx";

function SectionTitle({ children }) {
  return (
    <h3 className="mb-3 mt-1 border-b border-slate-200 pb-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
      {children}
    </h3>
  );
}

export default function FichaEditor({ form, setForm, formId, onSubmit }) {
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setSistema = (key, value) =>
    setForm((f) => ({ ...f, sistemas: { ...f.sistemas, [key]: value } }));

  return (
    <form id={formId} onSubmit={onSubmit} className="space-y-6">
      {/* Datos del paciente */}
      <section>
        <SectionTitle>Datos del paciente</SectionTitle>
        <div className="space-y-4">
          <div>
            <label className="label">Paciente</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Nombre completo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="col-span-1">
              <label className="label">Sexo</label>
              <select
                className="input"
                value={form.sexo}
                onChange={(e) => set({ sexo: e.target.value })}
              >
                <option value="">—</option>
                <option value="F">F</option>
                <option value="M">M</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="label">Fecha nac.</label>
              <input
                type="date"
                className="input"
                value={form.dob}
                onChange={(e) => set({ dob: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="label">Teléfono</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => set({ phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div>
            <label className="label">Dirección</label>
            <input
              className="input"
              value={form.direccion}
              onChange={(e) => set({ direccion: e.target.value })}
              placeholder="Calle, número, colonia"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Ocupación</label>
              <input
                className="input"
                value={form.ocupacion}
                onChange={(e) => set({ ocupacion: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Referido por</label>
              <input
                className="input"
                value={form.referidoPor}
                onChange={(e) => set({ referidoPor: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Enfermedades o padecimientos</label>
            <textarea
              className="input min-h-[60px] resize-y"
              value={form.enfermedades}
              onChange={(e) => set({ enfermedades: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Correo</label>
            <input
              type="email"
              className="input"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="paciente@example.com"
            />
          </div>
        </div>
      </section>

      {/* Historia clínica */}
      <section>
        <SectionTitle>Historia clínica</SectionTitle>
        <div className="space-y-4">
          <div>
            <label className="label">Historia odontológica</label>
            <textarea
              className="input min-h-[60px] resize-y"
              value={form.historiaOdontologica}
              onChange={(e) => set({ historiaOdontologica: e.target.value })}
            />
          </div>
          <div>
            <label className="label">
              Hospitalizaciones, medicamentos, drogas, alergias, etc.
            </label>
            <textarea
              className="input min-h-[60px] resize-y"
              value={form.hospitalizaciones}
              onChange={(e) => set({ hospitalizaciones: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Medicamento de cabecera</label>
            <input
              className="input"
              value={form.medicamentoCabecera}
              onChange={(e) => set({ medicamentoCabecera: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* Revisión por sistemas */}
      <section>
        <SectionTitle>Revisión por sistemas</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SISTEMAS.map((s) => (
            <div key={s.key}>
              <label className="label mb-1" title={s.hint || undefined}>
                {s.label}
              </label>
              <input
                className="input px-2.5 py-2"
                value={form.sistemas[s.key] ?? ""}
                onChange={(e) => setSistema(s.key, e.target.value)}
                placeholder={s.hint || "—"}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Odontograma */}
      <section>
        <SectionTitle>Odontograma</SectionTitle>
        <Odontogram
          value={form.odontograma}
          onChange={(odontograma) => set({ odontograma })}
        />
        <div className="mt-4">
          <label className="label">Observaciones del odontograma</label>
          <textarea
            className="input min-h-[60px] resize-y"
            value={form.odontogramaNotas}
            onChange={(e) => set({ odontogramaNotas: e.target.value })}
            placeholder="Notas sobre piezas específicas, hallazgos, etc."
          />
        </div>
      </section>

      {/* Plan de tratamiento */}
      <section>
        <SectionTitle>Plan de tratamiento</SectionTitle>
        <div>
          <label className="label">Plan de tratamiento</label>
          <textarea
            className="input min-h-[60px] resize-y"
            value={form.planTratamiento}
            onChange={(e) => set({ planTratamiento: e.target.value })}
          />
          <p className="mt-2 text-xs text-slate-400">
            Los procedimientos realizados se registran en el Historial clínico.
          </p>
        </div>
      </section>
    </form>
  );
}
