import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { AuthProvider } from "./backend/AuthContext";
import { LocaleProvider } from "./i18n";
import { ThemeProvider } from "./theme";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  </StrictMode>,
);
