import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { StoreProvider } from "./store/StoreContext.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { LanguageProvider } from "./i18n/LanguageContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <StoreProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </StoreProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>
);
