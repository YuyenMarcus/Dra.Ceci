import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useStore } from "../store/StoreContext.jsx";
import { normalizeFicha } from "../lib/ficha.js";

// Split a single CSV line honoring quoted fields ("a, b" stays one field) and
// escaped quotes ("" -> "). Works for the given delimiter.
function splitLine(line, delimiter) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

// Pick the delimiter from the header row. Excel in es/LatAm locales exports
// with ";"; Sheets and most others use ",". Tabs (TSV) are handled too. We pick
// whichever appears most in the header line.
function detectDelimiter(headerLine) {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function parseCsv(text) {
  // Strip a UTF-8 BOM (Excel adds one) so the first header isn't "\uFEFFname".
  const clean = String(text || "").replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], error: "import.errEmpty" };

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/[_-]+/g, " ").trim()
  );
  const idx = (names) => headers.findIndex((h) => names.includes(h));

  // Name columns can be combined ("name"/"nombre completo") OR split into
  // first/middle/last. Note "nombre"/"nombres" is treated as the FIRST-name
  // column so a "nombre" + "apellido" pair combines correctly; a lone "nombre"
  // column still works as the full name (handled in buildName below).
  const combinedI = idx(["name", "nombre completo", "paciente", "full name"]);
  const firstI = idx([
    "first name", "firstname", "first", "nombre", "nombres",
    "primer nombre", "given name",
  ]);
  const middleI = idx(["middle name", "segundo nombre"]);
  const lastI = idx([
    "last name", "lastname", "last", "apellido", "apellidos",
    "surname", "family name",
  ]);
  const phoneI = idx(["phone", "telefono", "teléfono", "tel", "celular", "móvil", "movil"]);
  const emailI = idx(["email", "correo", "e-mail", "correo electrónico"]);

  if (combinedI < 0 && firstI < 0 && lastI < 0) {
    return { rows: [], error: "import.errNoName" };
  }

  // Build a single display name from whichever name columns exist.
  const buildName = (cols) => {
    if (combinedI >= 0 && (cols[combinedI] || "").trim()) {
      return cols[combinedI].trim();
    }
    const parts = [firstI, middleI, lastI]
      .filter((i) => i >= 0)
      .map((i) => (cols[i] || "").trim())
      .filter(Boolean);
    return parts.join(" ");
  };

  const rows = lines
    .slice(1)
    .map((line) => {
      const cols = splitLine(line, delimiter);
      return normalizeFicha({
        name: buildName(cols),
        phone: phoneI >= 0 ? cols[phoneI] || "" : "",
        email: emailI >= 0 ? cols[emailI] || "" : "",
      });
    })
    .filter((r) => r.name);

  if (rows.length === 0) return { rows: [], error: "import.errNoRows" };
  return { rows, error: null };
}

export default function PatientImport() {
  const { t } = useLang();
  const { currentUser } = useAuth();
  const { addClient } = useStore();
  const inputRef = useRef(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onerror = () => {
      setError("import.errRead");
      e.target.value = "";
    };
    reader.onload = () => {
      const { rows, error: parseError } = parseCsv(reader.result);
      if (parseError) {
        setError(parseError);
        e.target.value = "";
        return;
      }
      rows.forEach((row) => addClient({ ...row, doctorId: currentUser.id }));
      setResult({ imported: rows.length });
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
        <input ref={inputRef} type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="hidden" onChange={handleFile} />
      </div>
      {result && (
        <p className="mt-3 text-sm text-emerald-700">
          {t("import.done", { n: result.imported })}
        </p>
      )}
      {error && <p className="mt-3 text-sm font-medium text-rose-600">{t(error)}</p>}
    </div>
  );
}
