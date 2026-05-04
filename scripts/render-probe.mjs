/**
 * GLSL Shader Vision — Probe Renderer
 *
 * Captures shader frames at specific time points using Puppeteer
 * and composites them into a contact sheet.
 *
 * Usage:
 *   node scripts/render-probe.mjs \\
 *     --shader examples/shaders/magic_orb.frag \\
 *     --times 0,0.5,1,2,4 \\
 *     --preset default \\
 *     --width 512 --height 512
 */

import puppeteer from "puppeteer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../preview-server.mjs";

// ─── Configuration ──────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.resolve(REPO_ROOT, ".pi", "glsl-shader-vision", "output");
const STATE_DIR = path.resolve(REPO_ROOT, ".pi", "glsl-shader-vision", "state");

// ─── Main (exported for extension use) ─────────────────────

async function renderProbe(options) {
  const shaderPath = options.shader;
  const times = options.times?.length ? options.times : [0, 0.5, 1, 2, 4];
  const preset = options.preset || "default";
  const width = options.width || 512;
  const height = options.height || 512;

  // Ensure output dirs
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(STATE_DIR, { recursive: true });

  // Start server
  const { server, port } = await startServer(5177);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--disable-gpu-sandbox",
      ],
    });

    // Capture each time point
    const captures = [];
    for (const t of times) {
      const frame = await captureFrame(browser, port, shaderPath, t, preset, width, height);
      if (frame) {
        captures.push({ time: t, buffer: frame });
      }
    }

    if (captures.length === 0) {
      throw new Error("No frames captured — check shader compilation");
    }

    // Composite contact sheet
    const sheet = await compositeSheet(captures, width, height);
    const baseName = path.basename(shaderPath, ".frag");
    const outputPath = path.join(OUTPUT_DIR, `${baseName}_probe_${preset}.png`);
    await fs.writeFile(outputPath, sheet);

    // Write metadata
    const meta = {
      shader: shaderPath,
      preset,
      times,
      resolution: { width, height },
      captures: captures.length,
      generated: new Date().toISOString(),
    };
    const metaPath = path.join(OUTPUT_DIR, `${baseName}_probe_${preset}.json`);
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

    return {
      ok: true,
      image_path: outputPath,
      meta_path: metaPath,
      times,
      captures: captures.length,
    };

  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

// ─── Frame capture ──────────────────────────────────────────

async function captureFrame(browser, port, shaderPath, time, preset, width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width: width + 40, height: height + 60 }); // Extra for UI chrome

  try {
    const url = `http://127.0.0.1:${port}/?shader=${encodeURIComponent(shaderPath)}&time=${time}&paused=1&preset=${encodeURIComponent(preset)}`;

    await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });

    // Wait for shader to compile and render
    try {
      await page.waitForFunction(
        () => document.body.getAttribute("data-shader-ready") === "ok",
        { timeout: 8000 }
      );
    } catch {
      // Check if there's an error
      const status = await page.evaluate(() => document.body.getAttribute("data-shader-ready"));
      console.error(`    Shader status: ${status || "unknown"}`);
      const errText = await page.evaluate(() => {
        const el = document.getElementById("error-overlay");
        return el && !el.classList.contains("hidden") ? el.textContent : null;
      });
      if (errText) console.error(`    Error: ${errText.substring(0, 200)}`);
      return null;
    }

    // Small delay to ensure the frame is fully rendered
    await new Promise((r) => setTimeout(r, 300));

    // Screenshot the canvas element
    const canvasEl = await page.$("#gl-canvas");
    if (!canvasEl) {
      console.error("    Canvas element not found");
      return null;
    }

    const buffer = await canvasEl.screenshot({ type: "png" });
    return buffer;

  } finally {
    await page.close();
  }
}

// ─── Contact sheet compositing ──────────────────────────────

async function compositeSheet(captures, frameWidth, frameHeight) {
  // Use Puppeteer to create a contact sheet page
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    const cols = Math.min(captures.length, 5);
    const rows = Math.ceil(captures.length / cols);
    const pad = 4;
    const labelH = 20;
    const totalW = cols * frameWidth + (cols + 1) * pad;
    const totalH = rows * (frameHeight + labelH) + (rows + 1) * pad;

    await page.setViewport({ width: totalW, height: totalH });

    // Build HTML with all frames as base64 images
    const framesHtml = captures.map((cap, i) => {
      const base64 = cap.buffer.toString("base64");
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = pad + col * (frameWidth + pad);
      const y = pad + row * (frameHeight + labelH + pad);

      return `
        <div style="position:absolute;left:${x}px;top:${y}px;width:${frameWidth}px;background:#111;">
          <img src="data:image/png;base64,${base64}" width="${frameWidth}" height="${frameHeight}" style="display:block;">
          <div style="color:#aaa;font:11px monospace;text-align:center;padding:2px 0;">t=${cap.time}s</div>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html><body style="margin:0;background:#1a1a2e;width:${totalW}px;height:${totalH}px;">
${framesHtml}
</body></html>`;

    await page.setContent(html, { waitUntil: "networkidle0" });
    const buffer = await page.screenshot({ type: "png", fullPage: true });
    return buffer;

  } finally {
    await browser.close();
  }
}

// ─── Argument parsing ──────────────────────────────────────

function parseArgs() {
  const raw = process.argv.slice(2);
  const args = {
    shader: "",
    times: [],
    preset: "default",
    width: 512,
    height: 512,
  };

  for (let i = 0; i < raw.length; i++) {
    switch (raw[i]) {
      case "--shader":
        args.shader = raw[++i] || "";
        break;
      case "--times":
        args.times = (raw[++i] || "").split(",").map(Number).filter((n) => !isNaN(n));
        break;
      case "--preset":
        args.preset = raw[++i] || "default";
        break;
      case "--width":
        args.width = parseInt(raw[++i]) || 512;
        break;
      case "--height":
        args.height = parseInt(raw[++i]) || 512;
        break;
    }
  }

  return args;
}

// ─── CLI entry (only runs when executed directly) ────────────
const __filename_probe = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename_probe) {
  const cliArgs = parseArgs();
  if (!cliArgs.shader) {
    console.error("Usage: node render-probe.mjs --shader <path> [--times 0,1,2] [--preset default] [--width 512] [--height 512]");
    process.exit(1);
  }
  console.log(`Probe: ${cliArgs.shader}`);
  console.log(`  Times: ${cliArgs.times.join(", ") || "default"}`);
  console.log(`  Preset: ${cliArgs.preset}`);
  console.log(`  Resolution: ${cliArgs.width}×${cliArgs.height}`);

  renderProbe(cliArgs).then((result) => {
    console.log(`\nProbe sheet saved: ${result.image_path}`);
    console.log(`Metadata: ${result.meta_path}`);
    process.exit(0);
  }).catch((err) => {
    console.error("Probe failed:", err.message);
    process.exit(1);
  });
}

export { renderProbe };
