import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set initial theme class on HTML element before React renders
const rootElement = document.documentElement;
const savedTheme = localStorage.getItem('theme') || 
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
rootElement.classList.add(savedTheme);

createRoot(document.getElementById("root")!).render(<App />);
