import { useEffect, useMemo, useState } from "react";
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

// Countries surfaced at the top of the picker (clinic is US, many patients are
// from Central America). Everything else follows alphabetically.
const PREFERRED = ["US", "SV", "GT", "MX", "HN", "NI", "CR", "PA"];

function regionName(code, lang) {
  try {
    return new Intl.DisplayNames([lang], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

// Phone input that always emits a canonical E.164 value (e.g. +50355551234)
// plus a validity flag, so matching across visits is reliable regardless of how
// the patient types their number.
export default function PhoneField({
  defaultCountry = "US",
  lang = "es",
  value = "",
  onChange,
  placeholder = "5555 1234",
  required = false,
  id,
}) {
  const [country, setCountry] = useState(defaultCountry);
  const [national, setNational] = useState(value);

  const countries = useMemo(() => {
    const list = getCountries().map((c) => ({
      code: c,
      calling: getCountryCallingCode(c),
      name: regionName(c, lang),
    }));
    list.sort((a, b) => {
      const pa = PREFERRED.indexOf(a.code);
      const pb = PREFERRED.indexOf(b.code);
      if (pa !== -1 && pb !== -1) return pa - pb;
      if (pa !== -1) return -1;
      if (pb !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [lang]);

  useEffect(() => {
    const pn = parsePhoneNumberFromString(national || "", country);
    onChange?.({
      e164: pn ? pn.number : "",
      valid: pn ? pn.isValid() : false,
      country,
      national,
    });
    // onChange is intentionally excluded; parents pass inline handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, national]);

  return (
    <div className="flex gap-2">
      <select
        className="input w-36 shrink-0"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        aria-label="country code"
      >
        {countries.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} +{c.calling}
          </option>
        ))}
      </select>
      <input
        id={id}
        className="input flex-1"
        type="tel"
        required={required}
        value={national}
        onChange={(e) => setNational(e.target.value)}
        placeholder={placeholder}
        autoComplete="tel-national"
      />
    </div>
  );
}
