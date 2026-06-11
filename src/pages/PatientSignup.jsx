import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, MailCheck } from "lucide-react";
import BrandMark from "../components/BrandMark.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import PhoneField from "../components/PhoneField.jsx";
import ResendConfirmation from "../components/ResendConfirmation.jsx";

export default function PatientSignup() {
  const navigate = useNavigate();
  const { signUpPatient, isClient } = useAuth();
  const { t, lang } = useLang();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isClient) navigate("/me", { replace: true });
  }, [isClient, navigate]);

  async function submit(e) {
    e.preventDefault();
    if (!phoneValid) {
      setError("err.validPhone");
      return;
    }
    setBusy(true);
    setError("");
    const res = await signUpPatient({ email, password, name, phone });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || "err.noBackend");
      return;
    }
    if (res.needsConfirmation) {
      setDone(true);
      return;
    }
    navigate("/me", { replace: true });
  }

  if (done) {
    return (
      <div className="portal-scope flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <MailCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t("auth.checkEmail")}</h1>
          <p className="mt-2 text-sm text-slate-500">{t("auth.confirmSent")}</p>
          <p className="mt-2 text-xs text-slate-400">{t("auth.noEmail")}</p>
          <ResendConfirmation email={email} redirectPath="/me/login" />
          <Link
            to="/me/login"
            className="mt-5 inline-block text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-scope flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/me/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft size={16} /> {t("auth.signIn")}
          </Link>
          <LanguageToggle />
        </div>

        <div className="card p-8">
          <BrandMark size={48} rounded="rounded-2xl" className="mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">{t("psignup.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("psignup.sub")}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">{t("book.yourName")}</label>
              <input
                className="input"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder={t("book.fullName")}
              />
            </div>
            <div>
              <label className="label">{t("book.phoneNumber")}</label>
              <PhoneField
                lang={lang}
                onChange={({ e164, valid }) => {
                  setPhone(e164);
                  setPhoneValid(valid);
                  setError("");
                }}
              />
              <p className="mt-1 text-xs text-slate-400">{t("psignup.phoneHint")}</p>
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
                placeholder="you@example.com"
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
            {error && (
              <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
                {t(error)}
              </p>
            )}
            {(error === "err.emailInUse" || error === "err.emailNotConfirmed") && (
              <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm">
                <p className="text-slate-600">{t("auth.alreadyExists")}</p>
                <ResendConfirmation email={email} redirectPath="/me/login" />
                <Link
                  to="/me/login"
                  className="mt-2 inline-block font-medium text-brand-600 hover:text-brand-700"
                >
                  {t("auth.signIn")}
                </Link>
              </div>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full py-3 disabled:opacity-60">
              <UserPlus size={18} /> {t("auth.createAccount")}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            {t("auth.haveAccount")}{" "}
            <Link to="/me/login" className="font-medium text-brand-600 hover:text-brand-700">
              {t("auth.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
