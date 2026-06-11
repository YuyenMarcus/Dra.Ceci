import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, UserPlus, MailCheck, CalendarPlus, HeartPulse, Tag, Check } from "lucide-react";
import BrandMark from "../components/BrandMark.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import { useSeo } from "../lib/seo.js";
import LanguageToggle from "../components/LanguageToggle.jsx";
import ResendConfirmation from "../components/ResendConfirmation.jsx";
import { checkAffiliateCode } from "../store/db.js";

function normalizeCode(value) {
  return (value || "").replace(/\s/g, "").toUpperCase();
}

function slugify(value) {
  return (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, isDoctor } = useAuth();
  const { t } = useLang();
  useSeo({ title: t("seo.signupTitle"), description: t("seo.signupDesc"), path: "/signup" });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const [searchParams] = useSearchParams();
  const [referralCode, setReferralCode] = useState(() =>
    normalizeCode(searchParams.get("ref"))
  );
  // null = unknown/unchecked, true/false = validated against the affiliates list
  const [referralValid, setReferralValid] = useState(null);
  const [referralDiscount, setReferralDiscount] = useState(0);
  // Reveal the code field by default only when a code arrived via ?ref=.
  const [showReferral, setShowReferral] = useState(() =>
    Boolean(normalizeCode(searchParams.get("ref")))
  );

  useEffect(() => {
    if (isDoctor) navigate("/app", { replace: true });
  }, [isDoctor, navigate]);

  // Validate the referral code (debounced) so the user sees it's recognized.
  useEffect(() => {
    const code = normalizeCode(referralCode);
    if (!code) {
      setReferralValid(null);
      setReferralDiscount(0);
      return undefined;
    }
    let active = true;
    const id = setTimeout(() => {
      checkAffiliateCode(code).then(({ valid, discountPct }) => {
        if (!active) return;
        setReferralValid(valid);
        setReferralDiscount(valid ? discountPct : 0);
      });
    }, 400);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [referralCode]);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  async function submit(e) {
    e.preventDefault();
    if (!agreed) {
      setError("err.acceptTerms");
      return;
    }
    setBusy(true);
    setError("");
    const res = await signUp({
      email,
      password,
      name,
      slug: effectiveSlug,
      referralCode: normalizeCode(referralCode),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "err.noBackend");
      return;
    }
    if (res.needsConfirmation) {
      setDone(true);
      return;
    }
    navigate("/app", { replace: true });
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <MailCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t("auth.checkEmail")}</h1>
          <p className="mt-2 text-sm text-slate-500">{t("auth.confirmSent")}</p>
          <p className="mt-2 text-xs text-slate-400">{t("auth.noEmail")}</p>
          <ResendConfirmation email={email} redirectPath="/login" />
          <Link
            to="/login"
            className="mt-5 inline-block text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 lg:flex-row">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white lg:flex lg:w-2/5">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark size={40} />
          <span className="text-xl font-bold">Clinika</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">{t("auth.signupTitle")}</h2>
          <p className="mt-3 max-w-sm text-white/80">{t("auth.signupSub")}</p>
        </div>
        <p className="text-sm text-white/60">{t("app.tagline")}</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft size={16} /> {t("auth.signIn")}
            </Link>
            <LanguageToggle />
          </div>

          <div className="mb-6 rounded-2xl border border-portal-200 bg-gradient-to-br from-portal-50 to-white p-4 shadow-sm dark:border-portal-800 dark:from-portal-950/40 dark:to-slate-900">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-portal-600 text-white">
                <HeartPulse size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{t("login.tabClient")}</p>
                <p className="mt-0.5 text-sm text-slate-500">{t("app.imPatientHint")}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Link to="/find" className="btn-portal justify-center px-4 py-2.5 text-sm">
                    <CalendarPlus size={16} /> {t("login.imPatient")}
                  </Link>
                  <Link
                    to="/me/signup"
                    className="btn justify-center border border-portal-200 bg-white px-4 py-2.5 text-sm text-portal-700 hover:bg-portal-50 dark:border-portal-700 dark:bg-slate-800 dark:text-portal-200 dark:hover:bg-portal-950/50"
                  >
                    {t("plogin.createOne")}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">{t("auth.signupTitle")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("auth.signupSub")}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">{t("auth.name")}</label>
              <input
                className="input"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder={t("auth.namePlaceholder")}
              />
            </div>
            <div>
              <label className="label">{t("auth.clinicSlug")}</label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand-500">
                <span className="text-sm text-slate-400">/c/</span>
                <input
                  className="w-full bg-transparent px-1 py-2.5 text-sm outline-none"
                  value={effectiveSlug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="dra-ana-lopez"
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">{t("auth.slugHint")}</p>
            </div>
            <div>
              <label className="label">{t("login.email")}</label>
              <input
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="you@clinic.com"
              />
            </div>
            <div>
              <label className="label">{t("login.password")}</label>
              <input
                className="input"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
              />
            </div>
            {showReferral ? (
              <div>
                <label className="label">{t("auth.referralLabel")}</label>
                <div
                  className={`flex items-center rounded-xl border bg-white px-3 focus-within:border-brand-500 ${
                    referralValid === false ? "border-rose-300" : "border-slate-200"
                  }`}
                >
                  <Tag size={15} className="shrink-0 text-slate-400" />
                  <input
                    className="w-full bg-transparent px-2 py-2.5 text-sm uppercase outline-none"
                    value={referralCode}
                    onChange={(e) => setReferralCode(normalizeCode(e.target.value))}
                    placeholder={t("auth.referralPlaceholder")}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  {referralValid === true && (
                    <Check size={16} className="shrink-0 text-emerald-600" />
                  )}
                </div>
                <p
                  className={`mt-1 text-xs ${
                    referralValid === true
                      ? "font-medium text-emerald-600"
                      : referralValid === false
                        ? "text-rose-500"
                        : "text-slate-400"
                  }`}
                >
                  {referralCode && referralValid === true
                    ? referralDiscount > 0
                      ? t("auth.referralValidDiscount", {
                          pct: Math.round(referralDiscount * 100),
                        })
                      : t("auth.referralValid")
                    : referralCode && referralValid === false
                      ? t("auth.referralInvalid")
                      : t("auth.referralHint")}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowReferral(true)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                <Tag size={14} /> {t("auth.referralToggle")}
              </button>
            )}

            <label className="flex items-start gap-2.5 text-sm text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setError("");
                }}
              />
              <span>
                {t("auth.agreePre")}
                <Link
                  to="/terms"
                  target="_blank"
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {t("auth.agreeTerms")}
                </Link>
                {t("auth.agreeMid")}
                <Link
                  to="/privacy"
                  target="_blank"
                  className="font-medium text-brand-600 hover:text-brand-700"
                >
                  {t("auth.agreePrivacy")}
                </Link>
                .
              </span>
            </label>
            {error && (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
                {t(error)}
              </p>
            )}
            {(error === "err.emailInUse" || error === "err.emailNotConfirmed") && (
              <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm">
                <p className="text-slate-600">{t("auth.alreadyExists")}</p>
                <ResendConfirmation email={email} redirectPath="/login" />
                <Link
                  to="/login"
                  className="mt-2 inline-block font-medium text-brand-600 hover:text-brand-700"
                >
                  {t("auth.signIn")}
                </Link>
              </div>
            )}
            <button
              type="submit"
              disabled={busy || !agreed}
              className="btn-primary w-full py-3 disabled:opacity-60"
            >
              <UserPlus size={18} /> {t("auth.createAccount")}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
              {t("auth.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
