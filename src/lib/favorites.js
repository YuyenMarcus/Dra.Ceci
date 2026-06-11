import { useCallback, useEffect, useState } from "react";

// Patients can "star" clinics in the public directory. Favorites are stored
// per-browser in localStorage so this works for anonymous visitors and
// logged-in patients alike (no account or backend write required). Keyed by
// clinic id, which is stable across slug changes.
const KEY = "clinika.favoriteDoctors";

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [ids, setIds] = useState(read);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setIds(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((id) => {
    if (!id) return;
    setIds((cur) => {
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage may be unavailable */
      }
      return next;
    });
  }, []);

  const isFav = useCallback((id) => ids.includes(id), [ids]);

  return { favoriteIds: ids, isFav, toggle };
}
