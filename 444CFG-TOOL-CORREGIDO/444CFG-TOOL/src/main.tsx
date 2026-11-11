import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PrefsProvider } from "./services/prefs";
import { ToastProvider } from "./components/ui";
import "./styles/app.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><PrefsProvider><ToastProvider><App /></ToastProvider></PrefsProvider></React.StrictMode>
);
