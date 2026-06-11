import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { hasConflict } from "../lib/availability.js";
import { useAuth } from "../auth/AuthContext.jsx";
import * as db from "./db.js";

const StoreContext = createContext(null);

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function StoreProvider({ children }) {
  const { clinic } = useAuth();
  const clinicId = clinic?.id ?? null;

  const [inventory, setInventory] = useState([]);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clinicId) {
      setInventory([]);
      setClients([]);
      setAppointments([]);
      return undefined;
    }
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await db.loadClinicData(clinicId);
        if (!active) return;
        setInventory(data.inventory);
        setClients(data.clients);
        setAppointments(data.appointments);
      } catch (err) {
        console.error("Could not load clinic data:", err);
        if (active) setError(err.message || "Could not load data.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clinicId]);

  const sync = useCallback(async (fn) => {
    try {
      await fn();
    } catch (err) {
      console.error("Supabase sync failed:", err);
    }
  }, []);

  // ---- Inventory ----
  const addItem = useCallback(
    (item) => {
      if (!clinicId) return;
      const next = { ...item, id: newId(), updatedAt: new Date().toISOString() };
      setInventory((list) => [next, ...list]);
      sync(() => db.upsertInventoryItem(clinicId, next));
    },
    [clinicId, sync]
  );

  const updateItem = useCallback(
    (id, patch) => {
      let updated;
      setInventory((list) =>
        list.map((it) => {
          if (it.id !== id) return it;
          updated = { ...it, ...patch, updatedAt: new Date().toISOString() };
          return updated;
        })
      );
      if (updated && clinicId) sync(() => db.upsertInventoryItem(clinicId, updated));
    },
    [clinicId, sync]
  );

  const adjustQuantity = useCallback(
    (id, delta) => {
      let updated;
      setInventory((list) =>
        list.map((it) => {
          if (it.id !== id) return it;
          updated = {
            ...it,
            quantity: Math.max(0, Number(it.quantity) + delta),
            updatedAt: new Date().toISOString(),
          };
          return updated;
        })
      );
      if (updated && clinicId) sync(() => db.upsertInventoryItem(clinicId, updated));
    },
    [clinicId, sync]
  );

  const removeItem = useCallback(
    (id) => {
      setInventory((list) => list.filter((it) => it.id !== id));
      sync(() => db.deleteInventoryItem(id));
    },
    [sync]
  );

  // ---- Patients (clients) ----
  const addClient = useCallback(
    (client) => {
      if (!clinicId) return;
      const next = {
        ...client,
        id: newId(),
        doctorId: clinicId,
        createdAt: new Date().toISOString(),
      };
      setClients((list) => [next, ...list]);
      sync(() => db.upsertPatient(clinicId, next));
    },
    [clinicId, sync]
  );

  const updateClient = useCallback(
    (id, patch) => {
      let updated;
      setClients((list) =>
        list.map((c) => {
          if (c.id !== id) return c;
          updated = { ...c, ...patch };
          return updated;
        })
      );
      if (updated && clinicId) sync(() => db.upsertPatient(clinicId, updated));
    },
    [clinicId, sync]
  );

  const removeClient = useCallback(
    (id) => {
      let apptIds = [];
      setAppointments((list) => {
        apptIds = list.filter((a) => a.clientId === id).map((a) => a.id);
        return list.filter((a) => a.clientId !== id);
      });
      setClients((list) => list.filter((c) => c.id !== id));
      sync(async () => {
        await Promise.all(apptIds.map((aid) => db.deleteAppointment(aid)));
        await db.deletePatient(id);
      });
    },
    [sync]
  );

  // ---- Appointments ----
  const addAppointment = useCallback(
    (apt) => {
      if (!clinicId) return;
      const next = {
        ...apt,
        id: newId(),
        doctorId: clinicId,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };
      setAppointments((list) => [next, ...list]);
      sync(() => db.upsertAppointment(clinicId, next));
    },
    [clinicId, sync]
  );

  // Conflict-aware scheduling for the doctor app.
  const bookAppointment = useCallback(
    (apt) => {
      if (!clinicId) return { ok: false, error: "err.noBackend" };
      const startMs = new Date(apt.start).getTime();
      const endMs = startMs + (Number(apt.durationMin) || 30) * 60000;
      // Each branch keeps its own calendar: only check conflicts within the
      // same location (or among unassigned appointments when no branch is set).
      const sameBranch = apt.locationId
        ? appointments.filter((a) => a.locationId === apt.locationId)
        : appointments.filter((a) => !a.locationId);
      if (hasConflict(sameBranch, clinicId, startMs, endMs)) {
        return { ok: false, error: "err.timeTaken" };
      }
      const next = {
        ...apt,
        id: newId(),
        doctorId: clinicId,
        durationMin: Number(apt.durationMin) || 30,
        status: "scheduled",
        createdAt: new Date().toISOString(),
      };
      setAppointments((list) => [next, ...list]);
      sync(() => db.upsertAppointment(clinicId, next));
      return { ok: true };
    },
    [clinicId, appointments, sync]
  );

  const updateAppointment = useCallback(
    (id, patch) => {
      let updated;
      setAppointments((list) =>
        list.map((a) => {
          if (a.id !== id) return a;
          updated = { ...a, ...patch };
          return updated;
        })
      );
      if (updated && clinicId) sync(() => db.upsertAppointment(clinicId, updated));
    },
    [clinicId, sync]
  );

  const cancelAppointment = useCallback(
    (id) => updateAppointment(id, { status: "cancelled" }),
    [updateAppointment]
  );

  const removeAppointment = useCallback(
    (id) => {
      setAppointments((list) => list.filter((a) => a.id !== id));
      sync(() => db.deleteAppointment(id));
    },
    [sync]
  );

  const value = useMemo(
    () => ({
      // The single clinic maps to the legacy `doctors` array shape.
      doctors: clinic ? [{ ...clinic, role: "doctor" }] : [],
      clinic,
      inventory,
      clients,
      appointments,
      loading,
      error,
      addItem,
      updateItem,
      adjustQuantity,
      removeItem,
      addClient,
      updateClient,
      removeClient,
      addAppointment,
      bookAppointment,
      updateAppointment,
      cancelAppointment,
      removeAppointment,
    }),
    [
      clinic,
      inventory,
      clients,
      appointments,
      loading,
      error,
      addItem,
      updateItem,
      adjustQuantity,
      removeItem,
      addClient,
      updateClient,
      removeClient,
      addAppointment,
      bookAppointment,
      updateAppointment,
      cancelAppointment,
      removeAppointment,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within a StoreProvider");
  return ctx;
}
