/**
 * GLSL Shader Vision — Pi Extension
 *
 * Registers slash commands and agent tools for the GLSL shader viewer.
 * Manages the preview server lifecycle.
 *
 * Pi v0.72.1 API — TypeBox schemas, ExtensionAPI factory.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { startServer } from "./preview-server.mjs";
import { renderProbe } from "./scripts/render-probe.mjs";
import type { Server } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

// ─── Server management ──────────────────────────────────────
let serverInstance: Server | null = null;
let serverPort: number | null = null;

async function ensureServer(): Promise<number> {
  if (serverPort !== null && serverInstance?.listening) {
    return serverPort;
  }

  const { server, port } = await startServer(5177);
  serverInstance = server;
  serverPort = port;
  return port;
}

function stopServer() {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
    serverPort = null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function resolveShaderPath(cwd: string, shaderPath: string): string {
  if (path.isAbsolute(shaderPath)) {
    return path.resolve(shaderPath);
  }
  return path.resolve(cwd, shaderPath);
}

function derivePresetsPath(shaderPath: string): string {
  return shaderPath.replace(/\.frag$/, ".presets.json");
}

function deriveParamsPath(shaderPath: string): string {
  return shaderPath.replace(/\.frag$/, ".params.json");
}

function buildViewerUrl(port: number, shaderRelPath: string, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams({ shader: shaderRelPath, ...extra });
  return `http://127.0.0.1:${port}/?${params.toString()}`;
}

// ─── Extension ──────────────────────────────────────────────

export default function glslShaderVision(pi: ExtensionAPI) {
  // ── Commands ────────────────────────────────────────────

  pi.registerCommand("glsl-open", {
    description: "Open animated GLSL fragment shader preview",
    handler: async (args, ctx) => {
      const shaderPath = args?.trim();
      if (!shaderPath) {
        ctx.ui.notify("Usage: /glsl-open <path/to/shader.frag>", "error");
        return;
      }

      const resolved = resolveShaderPath(ctx.cwd, shaderPath);
      const relPath = path.relative(ctx.cwd, resolved);

      try {
        await fs.access(resolved);
      } catch {
        ctx.ui.notify(`Shader not found: ${resolved}`, "error");
        return;
      }

      try {
        const port = await ensureServer();
        const url = buildViewerUrl(port, relPath);
        ctx.ui.notify(`GLSL Viewer ready:\n${url}`, "info");
      } catch (err) {
        ctx.ui.notify(`Failed to start viewer server: ${err.message}`, "error");
      }
    },
  });

  pi.registerCommand("glsl-state", {
    description: "Show GLSL shader viewer state",
    handler: async (args, ctx) => {
      const shaderPath = args?.trim();
      const lines: string[] = [];

      lines.push(`Server: ${serverPort ? `http://127.0.0.1:${serverPort}` : "not running"}`);

      if (shaderPath) {
        const resolved = resolveShaderPath(ctx.cwd, shaderPath);
        try {
          await fs.access(resolved);
          lines.push(`Shader: ${resolved} — exists`);
        } catch {
          lines.push(`Shader: ${resolved} — NOT FOUND`);
        }
      }

      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  pi.registerCommand("glsl-probe", {
    description: "Generate probe sheet URLs for shader time samples",
    handler: async (args, ctx) => {
      const parsed = parseProbeArgs(args || "");
      if (!parsed.shaderPath) {
        ctx.ui.notify("Usage: /glsl-probe <shader.frag> --times 0,0.5,1,2,4 --preset default", "error");
        return;
      }

      const resolved = resolveShaderPath(ctx.cwd, parsed.shaderPath);
      const relPath = path.relative(ctx.cwd, resolved);

      try {
        await fs.access(resolved);
      } catch {
        ctx.ui.notify(`Shader not found: ${resolved}`, "error");
        return;
      }

      try {
        const port = await ensureServer();
        const times = parsed.times.length > 0 ? parsed.times : [0, 0.5, 1, 2, 4];
        const urls = times.map(
          (t) => buildViewerUrl(port, relPath, { time: String(t), preset: parsed.preset, paused: "1" })
        );

        const msg = [`Probe URLs for ${parsed.shaderPath} (preset: ${parsed.preset}):`, ...urls].join("\n");
        ctx.ui.notify(msg, "info");
      } catch (err) {
        ctx.ui.notify(`Failed to start viewer: ${err.message}`, "error");
      }
    },
  });

  // ── Tools ────────────────────────────────────────────────

  pi.registerTool({
    name: "open_glsl_shader_preview",
    label: "Open GLSL Preview",
    description:
      "Open a live animated WebGL preview for a GLSL fragment shader. Use when you need to visually validate a shader, check compile status, or let the user adjust uniforms.",
    promptSnippet: "Open live WebGL preview for <shader_path>",
    promptGuidelines: [
      "Use open_glsl_shader_preview after creating or editing a .frag shader to validate it compiles and renders correctly.",
    ],
    parameters: Type.Object({
      shader_path: Type.String({ description: "Path to .frag shader file (relative to cwd)" }),
      width: Type.Optional(Type.Number({ description: "Canvas width (default: auto-fit)" })),
      height: Type.Optional(Type.Number({ description: "Canvas height (default: auto-fit)" })),
      mode: Type.Optional(Type.String({ description: "Shader mode: auto, local, or shadertoy" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const resolved = resolveShaderPath(ctx.cwd, params.shader_path);
      const relPath = path.relative(ctx.cwd, resolved);

      try {
        await fs.access(resolved);
      } catch {
        return {
          content: [{ type: "text", text: `Shader not found: ${resolved}` }],
          details: { ok: false, error: "not_found" },
        };
      }

      try {
        const port = await ensureServer();
        const url = buildViewerUrl(port, relPath);

        return {
          content: [
            {
              type: "text",
              text: `GLSL Shader Vision preview opened.\n\nShader: ${params.shader_path}\nURL: ${url}\n\nOpen this URL in a browser to see the animated shader with live uniform controls.`,
            },
          ],
          details: {
            ok: true,
            url,
            shader_path: params.shader_path,
            status_path: `.pi/glsl-shader-vision/state/${path.basename(params.shader_path, ".frag")}.status.json`,
          },
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Failed to start preview server: ${err.message}` }],
          details: { ok: false, error: "server_error" },
        };
      }
    },
  });

  pi.registerTool({
    name: "read_glsl_shader_state",
    label: "Read GLSL Shader State",
    description: "Check the current state of a GLSL shader: whether the preview server is running and the shader file exists.",
    parameters: Type.Object({
      shader_path: Type.String({ description: "Path to .frag shader file" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const resolved = resolveShaderPath(ctx.cwd, params.shader_path);

      let shaderExists = false;
      let paramsExists = false;
      let presetsExists = false;
      let activePreset = null;

      try {
        await fs.access(resolved);
        shaderExists = true;
      } catch { /* not found */ }

      if (shaderExists) {
        try {
          await fs.access(deriveParamsPath(resolved));
          paramsExists = true;
        } catch { /* no params */ }

        try {
          const presetsPath = derivePresetsPath(resolved);
          await fs.access(presetsPath);
          presetsExists = true;
          const raw = await fs.readFile(presetsPath, "utf-8");
          const doc = JSON.parse(raw);
          activePreset = doc.active || "default";
        } catch { /* no presets */ }
      }

      return {
        content: [
          {
            type: "text",
            text: [
              `Shader: ${params.shader_path}`,
              `Server: ${serverPort ? `running at http://127.0.0.1:${serverPort}` : "not running"}`,
              `File exists: ${shaderExists ? "yes" : "NO"}`,
              `Params: ${paramsExists ? "yes" : "no"}`,
              `Presets: ${presetsExists ? `yes (active: ${activePreset})` : "no"}`,
            ].join("\n"),
          },
        ],
        details: {
          ok: shaderExists,
          shader_exists: shaderExists,
          params_exists: paramsExists,
          presets_exists: presetsExists,
          active_preset: activePreset,
          server_running: serverPort !== null,
          server_url: serverPort ? `http://127.0.0.1:${serverPort}` : null,
        },
      };
    },
  });

  pi.registerTool({
    name: "save_glsl_shader_preset",
    label: "Save Shader Preset",
    description: "Save a named preset with uniform values for a GLSL shader. Updates or creates the .presets.json file.",
    parameters: Type.Object({
      shader_path: Type.String({ description: "Path to .frag shader file" }),
      preset_name: Type.String({ description: "Name for this preset (e.g. 'blue_magic', 'warm_glow')" }),
      values: Type.Record(Type.String(), Type.Unknown(), { description: "Map of uniform name → value" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const resolved = resolveShaderPath(ctx.cwd, params.shader_path);
      const presetsPath = derivePresetsPath(resolved);

      let doc: { version: number; active: string; presets: Record<string, unknown> };
      try {
        const raw = await fs.readFile(presetsPath, "utf-8");
        doc = JSON.parse(raw);
      } catch {
        doc = { version: 1, active: params.preset_name, presets: {} };
      }

      doc.active = params.preset_name;
      doc.presets[params.preset_name] = params.values;

      await fs.writeFile(presetsPath, JSON.stringify(doc, null, 2), "utf-8");

      return {
        content: [
          {
            type: "text",
            text: `Preset "${params.preset_name}" saved for ${params.shader_path}\n\nFile: ${path.relative(ctx.cwd, presetsPath)}\nValues: ${Object.keys(params.values).length} uniforms`,
          },
        ],
        details: { ok: true, preset_path: path.relative(ctx.cwd, presetsPath) },
      };
    },
  });

  pi.registerTool({
    name: "render_glsl_shader_probe",
    label: "Render Shader Probe",
    description:
      "Generate a probe contact sheet for a GLSL shader. Captures frames at specified time points using headless Chrome (Puppeteer), composites them into a single PNG, and saves metadata JSON. Requires Puppeteer to be installed.",
    parameters: Type.Object({
      shader_path: Type.String({ description: "Path to .frag shader file" }),
      times: Type.Optional(Type.Array(Type.Number(), { description: "Time values in seconds (default: [0, 0.5, 1, 2, 4])" })),
      preset: Type.Optional(Type.String({ description: "Preset name to apply (default: 'default')" })),
    }),
    async execute(_toolCallId, params, _signal, onUpdate, ctx) {
      const resolved = resolveShaderPath(ctx.cwd, params.shader_path);

      try {
        await fs.access(resolved);
      } catch {
        return {
          content: [{ type: "text", text: `Shader not found: ${resolved}` }],
          details: { ok: false, error: "not_found" },
        };
      }

      try {
        onUpdate?.({ content: [{ type: "text", text: "Launching headless browser for probe capture..." }] });

        const result = await renderProbe({
          shader: resolved,
          times: params.times,
          preset: params.preset,
        });

        const relImage = path.relative(ctx.cwd, result.image_path);
        const relMeta = path.relative(ctx.cwd, result.meta_path);

        return {
          content: [
            {
              type: "text",
              text: [
                `Probe generated for ${params.shader_path}`,
                `Preset: ${params.preset || "default"}`,
                `Times: ${result.times.join(", ")} (${result.captures} frames)`,
                `Contact sheet: ${relImage}`,
                `Metadata: ${relMeta}`,
              ].join("\n"),
            },
          ],
          details: {
            ok: true,
            compile_ok: true,
            image_path: result.image_path,
            meta_path: result.meta_path,
            times: result.times,
            captures: result.captures,
          },
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Probe failed: ${err.message}` }],
          details: { ok: false, error: "probe_error", message: err.message },
        };
      }
    },
  });

  // ── Lifecycle ────────────────────────────────────────────

  pi.on("session_shutdown", async () => {
    stopServer();
  });
}

// ─── Argument parser for probe command ─────────────────────
function parseProbeArgs(raw: string): {
  shaderPath: string;
  times: number[];
  preset: string;
} {
  const parts = raw.split(/\s+--/);
  const shaderPath = parts[0]?.trim() || "";
  let times: number[] = [];
  let preset = "default";

  for (const part of parts.slice(1)) {
    const [key, ...rest] = part.split(/\s+/);
    const value = rest.join(" ").trim();
    if (key === "times") {
      times = value.split(",").map(Number).filter((n) => !isNaN(n));
    } else if (key === "preset") {
      preset = value || "default";
    }
  }

  return { shaderPath, times, preset };
}
