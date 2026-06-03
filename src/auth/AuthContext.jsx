import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase, isSupabaseEnabled, appUrl } from "../lib/supabase.js";
import {
  getMyClinic,
  linkPatientRecords,
  countMyPatientRecords,
} from "../store/db.js";

const AuthContext = createContext(null);

function slugify(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Supabase hides whether an email exists (anti-enumeration): signing up with an
// already-registered email returns a user with an empty `identities` array and
// no session, and sends no email. Detect that so we can tell the user to log in.
function isEmailAlreadyRegistered(data) {
  return Boolean(
    data?.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [clinic, setClinic] = useState(null);
  // Whether this account also owns patient records of its own. When a doctor
  // account is ALSO a patient, this is true and we expose the portal switcher.
  const [hasPatientProfile, setHasPatientProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  // Front-desk "reception mode": when on, the doctor's own session is locked to
  // inventory + appointments and medical records are hidden. It stores which
  // clinic id it was enabled for so it only applies to that account. This is a
  // device/UI-level restriction (handy for a shared front-desk computer), not a
  // database access boundary — real per-staff accounts would need their own
  // logins + RLS.
  const [receptionClinicId, setReceptionClinicId] = useState(() => {
    try {
      return localStorage.getItem("medtrack.receptionMode") || null;
    } catch {
      return null;
    }
  });

  // Resolve the per-role context for a session. The source of truth for "is
  // this a doctor?" is clinic ownership, NOT the metadata role — that way an
  // account always reaches the right place even if its metadata drifts. If the
  // user owns a clinic they're a doctor; otherwise they're a patient. Either
  // way we claim any unlinked phone-based records so an account that is both a
  // doctor and a patient gets its own patient history attached.
  const resolveSession = useCallback(async (sessionUser) => {
    if (!sessionUser) {
      setClinic(null);
      setHasPatientProfile(false);
      return;
    }
    let ownedClinic = null;
    try {
      ownedClinic = await getMyClinic(sessionUser.id);
    } catch (err) {
      // Keep the previous clinic state on a transient failure instead of
      // flapping the user to "patient" (which would bounce them out of /app).
      console.error("Could not load clinic:", err);
      return;
    }
    setClinic(ownedClinic);

    // Link phone-based records for ANY account (a doctor can also be a patient
    // at other clinics), then detect whether this account owns patient records.
    const phone = sessionUser.user_metadata?.phone;
    if (phone) await linkPatientRecords(phone);
    try {
      const count = await countMyPatientRecords(sessionUser.id);
      setHasPatientProfile(count > 0);
    } catch (err) {
      console.error("Could not detect patient profile:", err);
      setHasPatientProfile(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseEnabled) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    // Track the resolved identity so we only re-run the clinic lookup when the
    // signed-in user actually changes — not on every token refresh.
    let resolvedUserId;

    // Use a SINGLE auth listener as the source of truth. supabase-js emits an
    // `INITIAL_SESSION` event on subscribe, so this also covers first load — no
    // need for a separate getSession() call (running both caused two concurrent
    // getMyClinic() resolves to race and flap the clinic between set/null).
    //
    // IMPORTANT: never `await` other Supabase calls directly inside this
    // callback. It runs while the auth client holds an internal lock, and any
    // awaited DB/auth call (e.g. getMyClinic) would deadlock — leaving `loading`
    // stuck true forever. Defer the work to a macrotask so the lock is released.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null;
      const nextId = sessionUser?.id ?? null;
      setUser(sessionUser);

      // Identity unchanged (e.g. TOKEN_REFRESHED): keep the resolved clinic and
      // don't re-enter loading — that would flash the loading screen.
      if (nextId === resolvedUserId) return;
      resolvedUserId = nextId;

      // Go back to "loading" until the clinic lookup completes. Until then the
      // role is undecided, so guards/redirects must wait instead of treating a
      // freshly signed-in doctor as a patient (which flashed the patient portal).
      setLoading(true);
      setTimeout(() => {
        if (!active) return;
        resolveSession(sessionUser).finally(() => {
          if (active) setLoading(false);
        });
      }, 0);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, [resolveSession]);

  // Role is derived from data (clinic ownership), not metadata: owning a clinic
  // means doctor, any other authenticated user is a patient.
  const isDoctor = Boolean(user && clinic);
  const isClient = Boolean(user && !clinic);
  const role = isDoctor ? "doctor" : isClient ? "patient" : null;

  // An account is "dual-role" when it owns a clinic AND has its own patient
  // records. Only then do we surface the Doctor <-> Patient switcher, and only
  // then may a doctor account enter the patient portal.
  const canSwitchRoles = isDoctor && hasPatientProfile;
  const canAccessPatientPortal = isClient || canSwitchRoles;

  // Reception mode is active only while the locked clinic matches the signed-in
  // doctor's clinic.
  const receptionMode = Boolean(
    clinic && receptionClinicId && receptionClinicId === clinic.id
  );

  // Lock the app into reception mode. Requires a PIN to have been set so the
  // doctor can later unlock it. Returns false if no PIN is configured.
  const enterReception = useCallback(() => {
    if (!clinic || !clinic.profile?.receptionPin) return false;
    try {
      localStorage.setItem("medtrack.receptionMode", clinic.id);
    } catch {
      /* storage may be unavailable */
    }
    setReceptionClinicId(clinic.id);
    return true;
  }, [clinic]);

  // Leave reception mode. Requires the clinic's reception PIN.
  const exitReception = useCallback(
    (pin) => {
      const real = clinic?.profile?.receptionPin || "";
      if (real && String(pin).trim() !== String(real)) return false;
      try {
        localStorage.removeItem("medtrack.receptionMode");
      } catch {
        /* ignore */
      }
      setReceptionClinicId(null);
      return true;
    },
    [clinic]
  );

  // The doctor app reads `currentUser` for name/id — map the clinic onto that
  // shape so existing components keep working.
  const currentUser = useMemo(
    () => (clinic ? { ...clinic, role: "doctor" } : null),
    [clinic]
  );

  // Lightweight patient profile from auth metadata. Available for ANY signed-in
  // user (one account can be both a clinic owner and a patient), so a doctor can
  // also open their own patient portal at /me.
  const patient = useMemo(() => {
    if (!user) return null;
    return {
      id: user.id,
      name: user.user_metadata?.name ?? "",
      phone: user.user_metadata?.phone ?? "",
      email: user.email ?? "",
    };
  }, [user]);

  // Re-fetch the owner's clinic (used after editing the public profile so the
  // UI reflects saved changes without a full reload).
  const refreshClinic = useCallback(async () => {
    if (!user) return null;
    try {
      const fresh = await getMyClinic(user.id);
      setClinic(fresh);
      return fresh;
    } catch (err) {
      console.error("Could not refresh clinic:", err);
      return null;
    }
  }, [user]);

  const login = useCallback(async (email, password) => {
    if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      const code = error.code || error.message || "";
      if (/email.*not.*confirm/i.test(code)) {
        return { ok: false, error: "err.emailNotConfirmed" };
      }
      return { ok: false, error: "err.incorrectLogin" };
    }
    // Route by clinic ownership, not metadata role.
    let ownedClinic = null;
    try {
      ownedClinic = await getMyClinic(data.user.id);
    } catch {
      /* treated as patient below */
    }
    // Whether they also have a patient profile (used to route dual-role accounts
    // by the entrance they used and to decide if /me is reachable).
    let patientProfile = false;
    try {
      patientProfile = (await countMyPatientRecords(data.user.id)) > 0;
    } catch {
      /* default false */
    }
    return {
      ok: true,
      role: ownedClinic ? "doctor" : "patient",
      hasPatientProfile: patientProfile,
    };
  }, []);

  const signUp = useCallback(async ({ email, password, name, slug }) => {
    if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
    const finalSlug = slugify(slug || name) || `clinic-${Date.now().toString(36)}`;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { role: "doctor", name: name?.trim() || "", slug: finalSlug },
        emailRedirectTo: appUrl("/login"),
      },
    });
    if (error) return { ok: false, error: error.message };
    if (isEmailAlreadyRegistered(data)) return { ok: false, error: "err.emailInUse" };
    const needsConfirmation = !data.session;
    return { ok: true, needsConfirmation, slug: finalSlug };
  }, []);

  const signUpPatient = useCallback(async ({ email, password, name, phone }) => {
    if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          role: "patient",
          name: name?.trim() || "",
          phone: phone?.trim() || "",
        },
        emailRedirectTo: appUrl("/me/login"),
      },
    });
    if (error) return { ok: false, error: error.message };
    if (isEmailAlreadyRegistered(data)) return { ok: false, error: "err.emailInUse" };
    const needsConfirmation = !data.session;
    return { ok: true, needsConfirmation };
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: appUrl("/update-password"),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const updatePassword = useCallback(async (password) => {
    if (!isSupabaseEnabled) return { ok: false, error: "err.noBackend" };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseEnabled) await supabase.auth.signOut();
    setUser(null);
    setClinic(null);
    setHasPatientProfile(false);
    try {
      localStorage.removeItem("medtrack.receptionMode");
    } catch {
      /* ignore */
    }
    setReceptionClinicId(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      clinic,
      currentUser,
      patient,
      role,
      loading,
      isAuthenticated: isDoctor || isClient,
      isDoctor,
      isClient,
      hasPatientProfile,
      canSwitchRoles,
      canAccessPatientPortal,
      receptionMode,
      enterReception,
      exitReception,
      backendEnabled: isSupabaseEnabled,
      login,
      signUp,
      signUpPatient,
      resetPassword,
      updatePassword,
      refreshClinic,
      logout,
    }),
    [
      user,
      clinic,
      currentUser,
      patient,
      role,
      loading,
      isDoctor,
      isClient,
      hasPatientProfile,
      canSwitchRoles,
      canAccessPatientPortal,
      receptionMode,
      enterReception,
      exitReception,
      login,
      signUp,
      signUpPatient,
      resetPassword,
      updatePassword,
      refreshClinic,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
