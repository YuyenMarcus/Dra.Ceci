import Modal from "./Modal.jsx";
import { useLang } from "../i18n/LanguageContext.jsx";

export default function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  danger = true,
}) {
  const { t } = useLang();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title ?? t("common.confirm")}
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          >
            {confirmLabel ?? t("common.confirm")}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
