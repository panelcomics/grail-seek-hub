import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { ModalProvider } from "./contexts/ModalContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ModalProvider>
      <App />
    </ModalProvider>
  </HelmetProvider>
);
