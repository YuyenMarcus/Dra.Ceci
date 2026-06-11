import { Component } from "react";

// This boundary lives above LanguageProvider, so it can't use the translation
// hook. Read the saved language directly (same key as LanguageContext) so the
// crash screen still matches the user's language. Defaults to Spanish.
const COPY = {
  es: {
    title: "Algo salió mal",
    body: "La app encontró un error inesperado. Recargar suele solucionarlo.",
    reload: "Recargar app",
  },
  en: {
    title: "Something went wrong",
    body: "The app hit an unexpected error. A full reload usually fixes it.",
    reload: "Reload app",
  },
};

function crashCopy() {
  try {
    return localStorage.getItem("medtrack.lang") === "en" ? COPY.en : COPY.es;
  } catch {
    return COPY.es;
  }
}

// Catches runtime render errors anywhere below it and shows a recoverable
// fallback instead of a blank white screen. Critically useful in development:
// a bad hot-reload (e.g. changing hooks in a provider) throws during render,
// and without a boundary React unmounts the whole tree, leaving #root empty.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface it for debugging; the fallback also shows the message.
    console.error("Clinika crashed:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const copy = crashCopy();

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f1f5f9",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "32rem",
            width: "100%",
            background: "#fff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "28px",
            boxShadow: "0 1px 2px rgba(0,0,0,.05)",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>
            {copy.title}
          </h1>
          <p style={{ marginTop: "8px", fontSize: "14px", color: "#64748b" }}>
            {copy.body}
          </p>
          <pre
            style={{
              marginTop: "16px",
              maxHeight: "12rem",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
              fontSize: "12px",
              color: "#b91c1c",
            }}
          >
            {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: "16px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              borderRadius: "12px",
              background: "#0d9488",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {copy.reload}
          </button>
        </div>
      </div>
    );
  }
}
