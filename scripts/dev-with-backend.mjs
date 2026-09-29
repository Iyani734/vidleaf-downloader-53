// Starts the VidLeaf Python backend alongside the Vite dev server so the
// sandbox preview (and any local `npm run dev`) has a live backend to talk to.
// In production builds this file is not used.
import { spawn } from "node:child_process";

const backend = spawn(
  process.env.VIDLEAF_PYTHON || "python3",
  ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
  {
    cwd: new URL("../backend", import.meta.url).pathname,
    env: {
      ...process.env,
      QUEUE_BACKEND: process.env.QUEUE_BACKEND || "local",
      DATA_DIR: process.env.DATA_DIR || new URL("../backend/data", import.meta.url).pathname,
    },
    stdio: "inherit",
  },
);

backend.on("error", (err) => {
  console.error("[dev] failed to start backend:", err.message);
});

function startVite() {
  const vite = spawn("vite", ["dev", ...process.argv.slice(2)], {
    stdio: "inherit",
  });
  vite.on("exit", (code) => {
    backend.kill("SIGTERM");
    process.exit(code ?? 0);
  });
  vite.on("error", (err) => {
    console.error("[dev] failed to start vite:", err.message);
    backend.kill("SIGTERM");
    process.exit(1);
  });
}

process.on("SIGTERM", () => {
  backend.kill("SIGTERM");
  process.exit(0);
});
process.on("SIGINT", () => {
  backend.kill("SIGTERM");
  process.exit(0);
});

startVite();
