import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// @ts-ignore
import { registerSW } from "virtual:pwa-register";

if (process.env.NODE_ENV === "production") {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(<App />);
