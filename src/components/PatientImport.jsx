import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useStore } from "../store/StoreContext.jsx";
import { normalizeFicha } from "../lib/ficha.js";

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (names) => headers.findIndex((h) => names.includes(h));
  const nameI = idx(["name", "nombre", "paciente"]);
  const phoneI = idx(["phone", "telefono", "teléfono", "tel"]);
  const emailI = idx(["email", "correo"]);
  if (nameI < 0) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    return normalizeFicha({
      name: cols[nameI] || "",
      phone: phoneI >= 0 ? cols[phoneI] || "" : "",
      email: emailI >= 0 ? cols[emailI] || "" : "",
    });
  }).filter((r) => r.name);
}

export default function PatientImport() {
  const { t } = useLang();
  const { currentUser } = useAuth();
  const { addClient } = useStore();
  const inputRef = useRef(null);
  const [result, setResult] = useState(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result || ""));
      let imported = 0;
      rows.forEach((row) => {
        addClient({ ...row, doctorId: currentUser.id });
        imported += 1;
      });
      setResult({ imported, total: rows.length });
      e.target.value = "";
    };
    reader.readAsText(file);
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{t("import.title")}</p>
          <p className="text-sm text-slate-500">{t("import.hint")}</p>
        </div>
        <button type="button" className="btn-outline" onClick={() => inputRef.current?.click()}>
          <Upload size={16} /> {t("import.chooseFile")}
        </button>
        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      </div>
      {result && (
        <p className="mt-3 text-sm text-emerald-700">
          {t("import.done", { n: result.imported })}
        </p>
      )}
    </div>
  );
}
