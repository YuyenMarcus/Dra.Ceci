import { useEffect, useState } from "react";
import { Star, MessageSquareHeart, Check, Loader2 } from "lucide-react";
import { useLang } from "../i18n/LanguageContext.jsx";
import { submitTestimonial, getMyTestimonial } from "../store/db.js";

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n}`}
            className="rounded-md p-0.5 transition hover:scale-110"
          >
            <Star
              size={28}
              className={
                filled ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }
            />
          </button>
        );
      })}
    </div>
  );
}

export default function FeedbackCard() {
  const { t } = useLang();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [hadPrevious, setHadPrevious] = useState(false);

  useEffect(() => {
    let on = true;
    getMyTestimonial().then((tm) => {
      if (on && tm) {
        setRating(tm.rating || 0);
        setComment(tm.comment || "");
        setHadPrevious(true);
      }
    });
    return () => {
      on = false;
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!rating) {
      setError("err.ratingRequired");
      return;
    }
    setBusy(true);
    setError("");
    const res = await submitTestimonial({ rating, comment });
    setBusy(false);
    if (!res?.ok) {
      setError(res?.error || "err.feedbackFailed");
      return;
    }
    setHadPrevious(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <MessageSquareHeart size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{t("feedback.title")}</h2>
          <p className="text-sm text-slate-500">{t("feedback.hint")}</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div>
          <label className="label">{t("feedback.ratingLabel")}</label>
          <StarRating
            value={rating}
            onChange={(n) => {
              setRating(n);
              setError("");
            }}
          />
        </div>
        <div>
          <label className="label">{t("feedback.commentLabel")}</label>
          <textarea
            className="input min-h-[90px] resize-y"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("feedback.commentPh")}
            maxLength={1000}
          />
        </div>
        {error && (
          <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">
            {t(error)}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={busy} className="btn-primary disabled:opacity-60">
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : saved ? (
              <Check size={16} />
            ) : null}
            {saved
              ? t("feedback.saved")
              : hadPrevious
                ? t("feedback.update")
                : t("feedback.submit")}
          </button>
          <p className="text-xs text-slate-400">{t("feedback.private")}</p>
        </div>
      </form>
    </div>
  );
}
