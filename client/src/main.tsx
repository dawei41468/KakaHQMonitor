import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/i18n";
import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

createRoot(document.getElementById("root")!).render(<App />);
