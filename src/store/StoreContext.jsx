import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { seedData } from "./seed.js";
import { hasConflict } from "../lib/availability.js";
import { normalizePhone } from "../lib/format.js";

const STORAGE_KEY = "medtrack.data.v6";
const MAX_UPCOMING_PER_PHONE = 3;
const StoreContext = createContext(null);

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn("Could not read MedTrack data, using seed.", err);
  }
  return seedData;
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn("Could not persist MedTrack data.", err);
    }
  }, [data]);

  // ---- Inventory ----
  const addItem = useCallback((item) => {
    setData((d) => ({
      ...d,
      inventory: [
        { ...item, id: uid("inv"), updatedAt: new Date().toISOString() },
        ...d.inventory,
      ],
    }));
  }, []);

  const updateItem = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      inventory: d.inventory.map((it) =>
        it.id === id
          ? { ...it, ...patch, updatedAt: new Date().toISOString() }
          : it
      ),
    }));
  }, []);

  const adjustQuantity = useCallback((id, delta) => {
    setData((d) => ({
      ...d,
      inventory: d.inventory.map((it) =>
        it.id === id
          ? {
              ...it,
              quantity: Math.max(0, Number(it.quantity) + delta),
              updatedAt: new Date().toISOString(),
            }
          : it
      ),
    }));
  }, []);

  const removeItem = useCallback((id) => {
    setData((d) => ({
      ...d,
      inventory: d.inventory.filter((it) => it.id !== id),
    }));
  }, []);

  // ---- Clients ----
  const addClient = useCallback((client) => {
    setData((d) => ({
      ...d,
      clients: [
        { ...client, id: uid("cli"), createdAt: new Date().toISOString() },
        ...d.clients,
      ],
    }));
  }, []);

  const updateClient = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      clients: d.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const removeClient = useCallback((id) => {
    setData((d) => ({
      ...d,
      clients: d.clients.filter((c) => c.id !== id),
      // Also drop that client's appointments.
      appointments: d.appointments.filter((a) => a.clientId !== id),
    }));
  }, []);

  // ---- Appointments ----
  const addAppointment = useCallback((apt) => {
    setData((d) => ({
      ...d,
      appointments: [
        {
          ...apt,
          id: uid("apt"),
          status: "scheduled",
          createdAt: new Date().toISOString(),
        },
        ...d.appointments,
      ],
    }));
  }, []);

  // Conflict-aware scheduling. Returns { ok } or { ok:false, error }.
  const bookAppointment = useCallback((apt) => {
    const startMs = new Date(apt.start).getTime();
    const endMs = startMs + (Number(apt.durationMin) || 30) * 60000;
    let conflict = false;
    setData((d) => {
      conflict = hasConflict(d.appointments, apt.doctorId, startMs, endMs);
      if (conflict) return d;
      return {
        ...d,
        appointments: [
          {
            ...apt,
            id: uid("apt"),
            durationMin: Number(apt.durationMin) || 30,
            status: "scheduled",
            createdAt: new Date().toISOString(),
          },
          ...d.appointments,
        ],
      };
    });
    return conflict
      ? { ok: false, error: "err.timeTaken" }
      : { ok: true };
  }, []);

  // Public (no-login) booking. Validates the phone, enforces schedule
  // protections, auto-creates/links a patient ficha for the doctor, and books
  // conflict-free. Returns { ok } or { ok:false, error }.
  const requestAppointment = useCallback((payload) => {
    const {
      doctorId,
      provider,
      patientName,
      patientPhone,
      patientEmail = "",
      reason,
      notes = "",
      start,
      durationMin,
    } = payload;

    const phoneNorm = normalizePhone(patientPhone);
    if (phoneNorm.length < 7) {
      return { ok: false, error: "err.validPhone" };
    }
    if (!patientName || !patientName.trim()) {
      return { ok: false, error: "err.enterName" };
    }

    const startMs = new Date(start).getTime();
    const dur = Number(durationMin) || 30;
    const endMs = startMs + dur * 60000;
    const now = Date.now();

    let result = { ok: true };
    setData((d) => {
      // Guardrail 1: cap concurrent upcoming bookings per phone.
      const upcomingForPhone = d.appointments.filter(
        (a) =>
          a.status === "scheduled" &&
          new Date(a.start).getTime() >= now &&
          normalizePhone(a.patientPhone || "") === phoneNorm
      );
      if (upcomingForPhone.length >= MAX_UPCOMING_PER_PHONE) {
        result = {
          ok: false,
          error: "err.maxUpcoming",
          errorVars: { max: MAX_UPCOMING_PER_PHONE },
        };
        return d;
      }

      // Guardrail 2: same phone can't double-book overlapping times.
      const phoneOverlap = d.appointments.some((a) => {
        if (a.status !== "scheduled") return false;
        if (normalizePhone(a.patientPhone || "") !== phoneNorm) return false;
        const aStart = new Date(a.start).getTime();
        const aEnd = aStart + (a.durationMin || 30) * 60000;
        return aStart < endMs && startMs < aEnd;
      });
      if (phoneOverlap) {
        result = { ok: false, error: "err.alreadyAtTime" };
        return d;
      }

      // Guardrail 3: protect the doctor's calendar from double-booking.
      if (hasConflict(d.appointments, doctorId, startMs, endMs)) {
        result = {
          ok: false,
          error: "err.timeTaken",
        };
        return d;
      }

      // Link to an existing ficha for this doctor by phone, or create one.
      const existing = d.clients.find(
        (c) =>
          c.doctorId === doctorId && normalizePhone(c.phone || "") === phoneNorm
      );
      let clients = d.clients;
      let clientId;
      if (existing) {
        clientId = existing.id;
        clients = d.clients.map((c) =>
          c.id === existing.id
            ? {
                ...c,
                email: c.email || patientEmail,
                name: c.name || patientName,
              }
            : c
        );
      } else {
        clientId = uid("cli");
        clients = [
          {
            id: clientId,
            doctorId,
            name: patientName.trim(),
            email: patientEmail,
            phone: patientPhone,
            dob: "",
            notes: "Created from online booking.",
            createdAt: new Date().toISOString(),
          },
          ...d.clients,
        ];
      }

      const appt = {
        id: uid("apt"),
        doctorId,
        clientId,
        provider,
        patientName: patientName.trim(),
        patientPhone,
        patientEmail,
        reason: reason?.trim() || "Online booking",
        notes: notes?.trim() || "",
        start,
        durationMin: dur,
        status: "scheduled",
        source: "public",
        createdAt: new Date().toISOString(),
      };
      result = { ok: true, appointment: appt };
      return { ...d, clients, appointments: [appt, ...d.appointments] };
    });
    return result;
  }, []);

  const updateAppointment = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      appointments: d.appointments.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      ),
    }));
  }, []);

  const cancelAppointment = useCallback((id) => {
    setData((d) => ({
      ...d,
      appointments: d.appointments.map((a) =>
        a.id === id ? { ...a, status: "cancelled" } : a
      ),
    }));
  }, []);

  const removeAppointment = useCallback((id) => {
    setData((d) => ({
      ...d,
      appointments: d.appointments.filter((a) => a.id !== id),
    }));
  }, []);

  const resetData = useCallback(() => setData(seedData), []);

  const value = useMemo(
    () => ({
      ...data,
      addItem,
      updateItem,
      adjustQuantity,
      removeItem,
      addClient,
      updateClient,
      removeClient,
      addAppointment,
      bookAppointment,
      requestAppointment,
      updateAppointment,
      cancelAppointment,
      removeAppointment,
      resetData,
    }),
    [
      data,
      addItem,
      updateItem,
      adjustQuantity,
      removeItem,
      addClient,
      updateClient,
      removeClient,
      addAppointment,
      bookAppointment,
      requestAppointment,
      updateAppointment,
      cancelAppointment,
      removeAppointment,
      resetData,
    ]
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
