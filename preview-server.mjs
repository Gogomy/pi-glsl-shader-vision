/**
 * GLSL Shader Vision — Preview Server
 *
 * Lightweight HTTP server for the WebGL viewer. Serves static files
 * and provides API endpoints for shader source, params, and presets.
 * File watching via chokidar for hot reload signaling.
 *
 * Usage:
 *   node preview-server.mjs [--port 5177] [--cwd /path/to/project]
 */

import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chokidar from "chokidar";

// ─── Configuration ───────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUNDLED_PUBLIC_DIR = path.join(__dirname, "public");
const DEFAULT_PORT = 5177;

// Public dir: defaults to bundled, overridden if project root has its own public/
let PUBLIC_DIR = BUNDLED_PUBLIC_DIR;

// Project root — dynamically configurable via startServer().
// Fallback to process.cwd() so CLI usage still works.
let PROJECT_ROOT = process.cwd();

// MIME types for static files
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ─── Server state ────────────────────────────────────────────
let watcher = null;
const changeListeners = new Set();
let PROJECT_ROOT_OVERRIDE = null;

function getProjectRoot() {
  return PROJECT_ROOT_OVERRIDE || PROJECT_ROOT;
}

// ─── Path helpers ────────────────────────────────────────────

/**
 * Resolve a user-provided shader path to an absolute path.
 *
 * - Relative paths are resolved against the configured project root (user's cwd).
 * - Absolute paths are accepted directly with a security check ensuring they
 *   stay within allowed roots (project root OR the extension's own directory,
 *   for bundled shaders like pool_wave.frag).
 *
 * Block path traversal (../ outside allowed roots).
 */
function resolveShaderPath(shaderPath) {
  if (!shaderPath || typeof shaderPath !== "string") {
    return null;
  }

  let resolved;
  if (path.isAbsolute(shaderPath)) {
    resolved = path.resolve(shaderPath);
  } else {
    resolved = path.resolve(getProjectRoot(), shaderPath);
  }

  // Security: ensure resolved path stays within allowed roots
  // (project root for user shaders, extension dir for bundled shaders)
  const allowedRoots = [getProjectRoot(), __dirname];
  const isAllowed = allowedRoots.some((root) => {
    const rel = path.relative(root, resolved);
    return !rel.startsWith("..") && !path.isAbsolute(rel);
  });

  if (!isAllowed) {
    return null;
  }

  return resolved;
}

// ─── Static file serving ─────────────────────────────────────

async function serveStatic(req, res, filePath) {
  try {
    const fullPath = path.join(PUBLIC_DIR, filePath);

    // Security: ensure path is within PUBLIC_DIR
    const rel = path.relative(PUBLIC_DIR, fullPath);
    if (rel.startsWith("..")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const content = await fs.readFile(fullPath);
    const ext = path.extname(fullPath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": mime,
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } catch (err) {
    if (err.code === "ENOENT") {
      res.writeHead(404);
      res.end("Not found");
    } else {
      res.writeHead(500);
      res.end("Internal server error");
      console.error("Static serve error:", err.message);
    }
  }
}

// ─── API: Read file ──────────────────────────────────────────

async function serveShaderFile(req, res, shaderPath) {
  const resolved = resolveShaderPath(shaderPath);
  if (!resolved) {
    res.writeHead(400);
    res.end("Invalid shader path. Use a relative path within the project.");
    return;
  }

  try {
    const content = await fs.readFile(resolved, "utf-8");
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } catch (err) {
    if (err.code === "ENOENT") {
      res.writeHead(404);
      res.end(`Shader not found: ${shaderPath}`);
    } else {
      res.writeHead(500);
      res.end("Error reading shader file");
      console.error("Read error:", err.message);
    }
  }
}

async function serveJsonFile(req, res, shaderPath, suffix) {
  // Given shader.frag, derive shader.params.json or shader.presets.json
  const base = shaderPath.replace(/\.frag$/, "");
  const jsonPath = `${base}${suffix}`;
  const resolved = resolveShaderPath(jsonPath);

  if (!resolved) {
    res.writeHead(400);
    res.end("Invalid path.");
    return;
  }

  try {
    const content = await fs.readFile(resolved, "utf-8");
    // Validate it's parseable JSON
    JSON.parse(content);
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(content);
  } catch (err) {
    if (err.code === "ENOENT") {
      res.writeHead(404);
      res.end(`${suffix} not found for this shader`);
    } else if (err instanceof SyntaxError) {
      res.writeHead(400);
      res.end(`Invalid JSON in ${suffix}: ${err.message}`);
    } else {
      res.writeHead(500);
      res.end("Error reading file");
      console.error("JSON read error:", err.message);
    }
  }
}

// ─── API: Save preset ────────────────────────────────────────

async function savePreset(req, res) {
  let body = "";

  try {
    body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    const payload = JSON.parse(body);
    const { shader_path, preset_name, values } = payload;

    if (!shader_path || !preset_name || !values) {
      res.writeHead(400);
      res.end("Missing required fields: shader_path, preset_name, values");
      return;
    }

    const base = shader_path.replace(/\.frag$/, "");
    const presetsPath = resolveShaderPath(`${base}.presets.json`);

    if (!presetsPath) {
      res.writeHead(400);
      res.end("Invalid shader path");
      return;
    }

    // Read existing or create new
    let doc;
    try {
      const existing = await fs.readFile(presetsPath, "utf-8");
      doc = JSON.parse(existing);
    } catch {
      doc = { version: 1, active: preset_name, presets: {} };
    }

    doc.active = preset_name;
    doc.presets[preset_name] = values;

    await fs.writeFile(presetsPath, JSON.stringify(doc, null, 2), "utf-8");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, preset_path: `${base}.presets.json` }));
  } catch (err) {
    if (err instanceof SyntaxError) {
      res.writeHead(400);
      res.end(`Invalid JSON: ${err.message}`);
    } else {
      res.writeHead(500);
      res.end("Error saving preset");
      console.error("Save preset error:", err.message);
    }
  }
}

async function deletePreset(req, res) {
  let body = "";

  try {
    body = await new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

    const payload = JSON.parse(body);
    const { shader_path, preset_name } = payload;

    if (!shader_path || !preset_name) {
      res.writeHead(400);
      res.end("Missing required fields: shader_path, preset_name");
      return;
    }

    const base = shader_path.replace(/\.frag$/, "");
    const presetsPath = resolveShaderPath(`${base}.presets.json`);
    if (!presetsPath) {
      res.writeHead(400);
      res.end("Invalid shader path");
      return;
    }

    let doc;
    try {
      const raw = await fs.readFile(presetsPath, "utf-8");
      doc = JSON.parse(raw);
    } catch {
      res.writeHead(404);
      res.end("Presets file not found");
      return;
    }

    if (!doc.presets || !doc.presets[preset_name]) {
      res.writeHead(404);
      res.end("Preset not found");
      return;
    }

    delete doc.presets[preset_name];

    const names = Object.keys(doc.presets);
    if (doc.active === preset_name) {
      doc.active = doc.presets.default ? "default" : (names[0] || "default");
    }

    await fs.writeFile(presetsPath, JSON.stringify(doc, null, 2), "utf-8");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, active: doc.active, presets: names }));
  } catch (err) {
    if (err instanceof SyntaxError) {
      res.writeHead(400);
      res.end(`Invalid JSON: ${err.message}`);
    } else {
      res.writeHead(500);
      res.end("Error deleting preset");
      console.error("Delete preset error:", err.message);
    }
  }
}

// ─── File watching (hot reload signal) ───────────────────────

function startWatcher(shaderPath) {
  const root = getProjectRoot();
  const resolved = resolveShaderPath(shaderPath);
  if (!resolved) return;

  // Stop existing watcher
  if (watcher) {
    watcher.close();
  }

  // Watch the shader file and its sibling JSON files
  const base = shaderPath.replace(/\.frag$/, "");
  const patterns = [
    resolved,
    path.resolve(root, `${base}.params.json`),
    path.resolve(root, `${base}.presets.json`),
  ];

  watcher = chokidar.watch(patterns, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  watcher.on("change", (filePath) => {
    console.log(`[watcher] File changed: ${path.relative(root, filePath)}`);
    for (const listener of changeListeners) {
      try { listener(filePath); } catch {}
    }
  });

  watcher.on("error", (err) => {
    console.error("[watcher] Error:", err.message);
  });
}

// ─── Router ──────────────────────────────────────────────────

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const { pathname, searchParams } = url;

  // CORS for local development
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Static files ──
  if (pathname === "/" || pathname === "/index.html") {
    return serveStatic(req, res, "index.html");
  }
  if (pathname === "/viewer.js") {
    return serveStatic(req, res, "viewer.js");
  }
  if (pathname === "/style.css") {
    return serveStatic(req, res, "style.css");
  }

  // ── API: Events (SSE for hot reload) ──
  if (pathname === "/api/events" && req.method === "GET") {
    const root = getProjectRoot();
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const listener = (filePath) => {
      const rel = path.relative(root, filePath);
      res.write(`data: ${JSON.stringify({ changed: rel })}\n\n`);
    };

    changeListeners.add(listener);

    // Heartbeat
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 15000);

    req.on("close", () => {
      changeListeners.delete(listener);
      clearInterval(heartbeat);
    });
    return;
  }

  // ── API: Shader source ──
  if (pathname === "/api/shader" && req.method === "GET") {
    const shaderPath = searchParams.get("path");
    if (!shaderPath) {
      res.writeHead(400);
      res.end("Missing 'path' query parameter");
      return;
    }
    return serveShaderFile(req, res, shaderPath);
  }

  // ── API: Params JSON ──
  if (pathname === "/api/params" && req.method === "GET") {
    const shaderPath = searchParams.get("path");
    if (!shaderPath) {
      res.writeHead(400);
      res.end("Missing 'path' query parameter");
      return;
    }
    return serveJsonFile(req, res, shaderPath, ".params.json");
  }

  // ── API: Presets JSON ──
  if (pathname === "/api/presets" && req.method === "GET") {
    const shaderPath = searchParams.get("path");
    if (!shaderPath) {
      res.writeHead(400);
      res.end("Missing 'path' query parameter");
      return;
    }
    return serveJsonFile(req, res, shaderPath, ".presets.json");
  }

  // ── API: Save preset ──
  if (pathname === "/api/presets/save" && req.method === "POST") {
    return savePreset(req, res);
  }

  // ── API: Delete preset ──
  if (pathname === "/api/presets/delete" && req.method === "POST") {
    return deletePreset(req, res);
  }

  // ── 404 ──
  res.writeHead(404);
  res.end("Not found");
}

// ─── Startup ─────────────────────────────────────────────────

async function startServer(port, projectRoot) {
  const server = http.createServer(handleRequest);

  // Set project root — if provided, use it; otherwise resolve from the
  // shader that will be served, or fall back to process.cwd().
  if (projectRoot) {
    PROJECT_ROOT_OVERRIDE = projectRoot;
  }

  const root = getProjectRoot();

  // Detect dev repo: if project root has its own public/, use it
  // instead of the bundled one. This allows development on the repo
  // without editing files in the global npm install.
  const repoPublic = path.join(root, "public");
  try {
    await fs.access(path.join(repoPublic, "viewer.js"));
    PUBLIC_DIR = repoPublic;
    console.log(`[glsl-shader-vision] Using public dir: ${repoPublic}`);
  } catch {
    PUBLIC_DIR = BUNDLED_PUBLIC_DIR;
  }

  return new Promise((resolve, reject) => {
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        // Try next port
        server.listen(0, "127.0.0.1");
      } else {
        reject(err);
      }
    });

    server.listen(port, "127.0.0.1", () => {
      const addr = server.address();
      const actualPort = typeof addr === "object" ? addr.port : port;
      console.log(`[glsl-shader-vision] Server running at http://127.0.0.1:${actualPort}`);
      console.log(`[glsl-shader-vision] Project root: ${root}`);
      resolve({ server, port: actualPort });
    });
  });
}

// ─── CLI entry (only runs when executed directly) ────────────
const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] === __filename) {
  const args = process.argv.slice(2);
  let port = DEFAULT_PORT;
  let cliCwd;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--cwd" && args[i + 1]) {
      cliCwd = path.resolve(args[i + 1]);
      i++;
    }
  }

  const { server, port: actualPort } = await startServer(port, cliCwd);

  process.on("SIGINT", () => {
    console.log("\n[glsl-shader-vision] Shutting down...");
    if (watcher) watcher.close();
    server.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    if (watcher) watcher.close();
    server.close();
    process.exit(0);
  });
}

export { startServer, resolveShaderPath, getProjectRoot };
