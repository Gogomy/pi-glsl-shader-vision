/**
 * GLSL Shader Vision — WebGL Viewer
 *
 * Renders a GLSL fragment shader on a fullscreen quad with base uniforms
 * and Tweakpane-driven custom uniform controls from a .params.json file.
 */

// ─── DOM elements ───────────────────────────────────────────
const canvas = document.getElementById("gl-canvas");
const errorOverlay = document.getElementById("error-overlay");
const fpsEl = document.getElementById("fps");
const timeEl = document.getElementById("time-display");
const resEl = document.getElementById("resolution-display");
const shaderPathEl = document.getElementById("shader-path");
const compileStatusEl = document.getElementById("compile-status");
const shaderModeEl = document.getElementById("shader-mode");
const frameCountEl = document.getElementById("frame-count");
const paramsPanel = document.getElementById("params-panel");
const playPauseBtn = document.getElementById("play-pause-btn");

// ─── State ───────────────────────────────────────────────────
let gl = null;
let program = null;
let animFrameId = null;
let shaderSource = null;
let currentShaderPath = null;
let shaderMode = "local";

// Timing
let startTime = 0;
let lastTime = 0;
let frameCount = 0;
let fpsFrames = 0;
let fpsLastTime = 0;
let currentFps = 0;

// Mouse
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

// ─── Tweakpane state ────────────────────────────────────────
let pane = null;
let presetFolder = null;
let presetSelect = null;
let presetNameInput = null;

// uniformMeta: metadata from .params.json (type, label, min, max, step, group)
let uniformMeta = {};

// uniformValues: current values bound to Tweakpane, read each frame
//   float/int/bool → scalar
//   color → {r, g, b}
//   color_alpha → {r, g, b, a}
//   vec2 → {x, y}
let uniformValues = {};

// Available presets loaded from .presets.json
let availablePresets = {};
let activePresetName = "default";

// ─── Polling ─────────────────────────────────────────────────
let shaderPollInterval = null;
let paramsPollInterval = null;
let lastShaderFetch = "";
let lastParamsFetch = "";

// ─── Preview lifecycle / performance ───────────────────────
let probeMode = false;
let previewSuperseded = false;
let previewChannel = null;
let previewInstanceId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let hiddenStartedAt = 0;
let manualPaused = false;
let manualPausedStartedAt = 0;

// ─── Vertex shader (fixed) ──────────────────────────────────
const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Fullscreen quad: two triangles covering clip space
const QUAD_VERTICES = new Float32Array([
  -1, -1,   1, -1,  -1,  1,
  -1,  1,   1, -1,   1,  1,
]);

// ─── Initialization ──────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  currentShaderPath = params.get("shader");

  if (!currentShaderPath) {
    showError("No shader path specified.\nAdd ?shader=path/to/shader.frag to the URL.");
    return;
  }

  // Probe mode: override start time and/or pause after first frame
  const probeTime = parseFloat(params.get("time"));
  const isPaused = params.get("paused") === "1";
  const probePreset = params.get("preset");
  probeMode = isPaused || !Number.isNaN(probeTime);

  shaderPathEl.textContent = currentShaderPath;

  // WebGL context
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, alpha: false, antialias: false })
    || canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true, alpha: false, antialias: false });

  if (!gl) {
    showError("WebGL not available.\n\nTry Chrome/Edge with hardware acceleration, or Firefox with webgl.force-enabled=true");
    compileStatusEl.textContent = "WebGL unavailable";
    compileStatusEl.className = "status-error";
    return;
  }

  // Set black background immediately so canvas is never white
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Load shader + params + presets
  await fetchAndCompileShader();
  await fetchAndBuildParamsUI();
  await fetchAndLoadPresets();

  // Apply probe preset if specified (overrides loaded active preset)
  if (probePreset && availablePresets[probePreset]) {
    applyPreset(availablePresets[probePreset]);
    activePresetName = probePreset;
  }

  // Mark as ready for probe capture
  document.body.setAttribute("data-shader-ready", compileStatusEl.className.includes("ok") ? "ok" : "error");

  // Resize
  window.addEventListener("resize", handleResize);
  handleResize();

  if (playPauseBtn) {
    playPauseBtn.addEventListener("click", togglePlayPause);
    if (probeMode) {
      playPauseBtn.disabled = true;
      playPauseBtn.textContent = "Probe";
    } else {
      updatePlayPauseButton();
    }
  }

  // Mouse
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (rect.bottom - e.clientY) * (canvas.height / rect.height);
  });
  canvas.addEventListener("mousedown", () => { mouseDown = true; });
  canvas.addEventListener("mouseup", () => { mouseDown = false; });

  // Render loop — probe mode: start at specified time
  const now = performance.now();
  if (!isNaN(probeTime)) {
    startTime = now - probeTime * 1000;
  } else {
    startTime = now;
  }
  lastTime = startTime;
  fpsLastTime = startTime;

  // If paused, render exactly one frame then stop
  if (isPaused) {
    renderOneFrame(now);
  } else {
    lastTime = startTime;
    fpsLastTime = startTime;
    startLiveLoop();
  }

  // Hot reload polling
  shaderPollInterval = setInterval(pollShader, 500);
  paramsPollInterval = setInterval(pollParams, 500);

  // Only one live preview should stay active. Older tabs disable themselves.
  if (!probeMode && typeof BroadcastChannel !== "undefined") {
    previewChannel = new BroadcastChannel("glsl-shader-vision-preview");
    previewChannel.addEventListener("message", (event) => {
      const data = event.data || {};
      if (data.type === "viewer-opened" && data.instanceId !== previewInstanceId) {
        supersedePreview(data.shader || "another shader");
      }
    });
    previewChannel.postMessage({
      type: "viewer-opened",
      instanceId: previewInstanceId,
      shader: currentShaderPath,
    });
  }

  // Pause rendering when tab is hidden to reduce GPU/CPU usage.
  if (!probeMode) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        hiddenStartedAt = performance.now();
        stopLiveLoop();
      } else if (!previewSuperseded && !manualPaused) {
        if (hiddenStartedAt > 0) {
          const hiddenDelta = performance.now() - hiddenStartedAt;
          startTime += hiddenDelta;
          lastTime = performance.now();
          fpsLastTime = performance.now();
          hiddenStartedAt = 0;
        }
        startLiveLoop();
      }
    });
  }
}


// ─── Canvas ratio control ─────────────────────────────────
let canvasRatio = 1; // default 1:1
const canvasSizeEl = document.getElementById("canvas-size");

document.querySelectorAll(".preset-buttons button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".preset-buttons button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const ratio = btn.dataset.ratio;
    canvasRatio = parseFloat(ratio);
    handleResize();
  });
});

// ─── Canvas resize ───────────────────────────────────────────
function handleResize() {
  const container = canvas.parentElement;
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const maxDim = 640;

  let rw, rh;
  if (canvasRatio !== null) {
    // Fixed aspect ratio: fit within container while maintaining ratio
    if (cw / ch > canvasRatio) {
      rh = Math.min(ch, maxDim);
      rw = rh * canvasRatio;
    } else {
      rw = Math.min(cw, maxDim);
      rh = rw / canvasRatio;
    }
    // Cap max dimension
    if (rw > maxDim) { rh = rh * maxDim / rw; rw = maxDim; }
    if (rh > maxDim) { rw = rw * maxDim / rh; rh = maxDim; }
  } else {
    // Auto fit
    rw = Math.min(cw, maxDim);
    rh = Math.min(ch, maxDim);
  }

  canvas.width = Math.floor(rw);
  canvas.height = Math.floor(rh);
  if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  mouseX = canvas.width / 2;
  mouseY = canvas.height / 2;
  resEl.textContent = `${canvas.width}\u00d7${canvas.height}`;
  canvasSizeEl.textContent = `${canvas.width}\u00d7${canvas.height}`;
}

// ─── Shader loading ──────────────────────────────────────────
async function fetchAndCompileShader() {
  if (!gl) return;
  try {
    const resp = await fetch(`/api/shader?path=${encodeURIComponent(currentShaderPath)}`);
    if (!resp.ok) {
      const err = await resp.text();
      showError(`Failed to load shader: ${resp.status}\n${err}`);
      setCompileStatus("error", "Load failed");
      return;
    }
    shaderSource = await resp.text();
    lastShaderFetch = shaderSource;
    compileShader(shaderSource);
  } catch (e) {
    showError(`Network error loading shader:\n${e.message}`);
    setCompileStatus("error", "Network error");
  }
}

function compileShader(source) {
  if (!gl) return;
  shaderMode = source.includes("void mainImage(") ? "shadertoy" : "local";
  shaderModeEl.textContent = shaderMode;

  let fragSrc = shaderMode === "shadertoy" ? buildShadertoySource(source) : source;

  const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
  if (!vs) return;
  const fs = createShader(gl.FRAGMENT_SHADER, fragSrc);
  if (!fs) { gl.deleteShader(vs); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) || "Unknown link error";
    showError(`Program link error:\n${log}`);
    setCompileStatus("error", "Link error");
    gl.deleteProgram(prog);
    gl.deleteShader(fs);
    gl.deleteShader(vs);
    return;
  }

  if (program) gl.deleteProgram(program);
  program = prog;
  setupQuad();
  hideError();
  setCompileStatus("ok", "OK");
  if (manualPaused && !probeMode) {
    renderOneFrame(performance.now());
  }
  console.log("Shader compiled, mode:", shaderMode);
}

function buildShadertoySource(userSource) {
  let w = "";
  w += "precision highp float;\n";
  if (!userSource.includes("iResolution")) w += "uniform vec3 iResolution;\n";
  if (!userSource.includes("iTime")) w += "uniform float iTime;\n";
  if (!userSource.includes("iTimeDelta")) w += "uniform float iTimeDelta;\n";
  if (!userSource.includes("iFrame")) w += "uniform int iFrame;\n";
  if (!userSource.includes("iMouse")) w += "uniform vec4 iMouse;\n";
  w += userSource + "\n";
  if (!userSource.includes("void main(")) {
    w += "void main() {\n  mainImage(gl_FragColor, gl_FragCoord.xy);\n}\n";
  }
  return w;
}

function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || "Unknown compile error";
    const tname = type === gl.VERTEX_SHADER ? "Vertex" : "Fragment";
    showError(`${tname} shader compile error:\n${log}`);
    setCompileStatus("error", "Compile error");
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function setupQuad() {
  gl.useProgram(program);
  const posLoc = gl.getAttribLocation(program, "a_position");
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD_VERTICES, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
}

// ─── Apply defaults without Tweakpane (fallback) ─────────

function applyDefaultsFromParams(paramsJson) {
  const uniforms = paramsJson.uniforms || {};
  uniformMeta = {};
  uniformValues = {};

  for (const [name, meta] of Object.entries(uniforms)) {
    uniformMeta[name] = meta;
    const defVal = meta.default;

    switch (meta.type) {
      case "float":
      case "int":
        uniformValues[name] = defVal ?? 0;
        break;
      case "bool":
        uniformValues[name] = defVal ?? false;
        break;
      case "color":
        uniformValues[name] = arrayToColor(defVal ?? [1, 1, 1], false);
        break;
      case "color_alpha":
        uniformValues[name] = arrayToColor(defVal ?? [1, 1, 1, 1], true);
        break;
      case "vec2":
        uniformValues[name] = { x: defVal?.[0] ?? 0, y: defVal?.[1] ?? 0 };
        break;
      case "enum":
        uniformValues[name] = defVal ?? 0;
        break;
      default:
        uniformValues[name] = defVal ?? 0;
    }
  }
}

// ─── Tweakpane: Build parameter UI from .params.json ────────

async function fetchAndBuildParamsUI() {
  try {
    const resp = await fetch(`/api/params?path=${encodeURIComponent(currentShaderPath)}`);
    if (!resp.ok) {
      paramsPanel.innerHTML = '<div style="padding:14px;color:#888;font-size:12px;">No .params.json found.<br>Only base uniforms active.</div>';
      return;
    }
    const json = await resp.json();
    lastParamsFetch = JSON.stringify(json);

    // Always apply defaults so the shader renders correctly,
    // even if Tweakpane fails to load from CDN.
    applyDefaultsFromParams(json);

    // Try to build Tweakpane UI (may fail if CDN blocked)
    try {
      buildParamsUI(json);
    } catch (e) {
      console.warn("Tweakpane failed to load (CDN may be blocked):", e.message);
      paramsPanel.innerHTML = '<div style="padding:14px;color:#ff9800;font-size:12px;">⚠ Tweakpane not available.<br>Shader using default values from .params.json.<br><br>Check internet connection or CDN access to jsdelivr.net</div>';
    }
  } catch (e) {
    console.warn("Could not load params:", e.message);
    paramsPanel.innerHTML = '<div style="padding:14px;color:#888;font-size:12px;">No .params.json found.</div>';
  }
}

function buildParamsUI(paramsJson) {
  if (pane) {
    try { pane.dispose(); } catch {}
    pane = null;
  }
  paramsPanel.innerHTML = "";

  const uniforms = paramsJson.uniforms || {};
  if (Object.keys(uniforms).length === 0) {
    paramsPanel.innerHTML = '<div style="padding:14px;color:#888;font-size:12px;">No uniforms defined in .params.json</div>';
    return;
  }

  // Group by 'group' field
  const groups = {};
  for (const [name, meta] of Object.entries(uniforms)) {
    const g = meta.group || "General";
    if (!groups[g]) groups[g] = [];
    groups[g].push({ name, ...meta });
  }

  // Keep existing values for uniforms that already have them
  const savedValues = {};
  for (const [name, val] of Object.entries(uniformValues)) {
    savedValues[name] = val;
  }

  // Reset state (will be repopulated below)
  uniformMeta = {};
  uniformValues = {};

  // Create Tweakpane
  let TP;
  try {
    TP = window.Tweakpane;
    if (!TP) throw new Error("Tweakpane not loaded");
    pane = new TP.Pane({ container: paramsPanel, title: "Parameters" });
  } catch (e) {
    console.error("Tweakpane init failed:", e.message);
    paramsPanel.innerHTML = `<div style="padding:14px;color:#ff9800;font-size:12px;">\u26a0 Tweakpane not available: ${e.message}<br>Check CDN access to jsdelivr.net</div>`;
    return;
  }

  let controlErrors = [];

  // Add folders and controls (each isolated to prevent cascade failures)
  for (const [groupName, items] of Object.entries(groups)) {
    let folder;
    try {
      folder = pane.addFolder({ title: groupName });
    } catch (e) {
      controlErrors.push(`Folder "${groupName}": ${e.message}`);
      continue;
    }

    for (const item of items) {
      try {
        // Restore saved value if available
        if (savedValues[item.name] !== undefined) {
          uniformValues[item.name] = savedValues[item.name];
        }
        addControl(folder, item);
      } catch (e) {
        controlErrors.push(`${item.name}: ${e.message}`);
        // Still register the uniform with defaults so the shader works
        uniformMeta[item.name] = item;
        applyDefaultForUniform(item.name, item);
      }
    }
  }

  // Show any control errors in the panel
  if (controlErrors.length > 0) {
    console.warn("Control errors:", controlErrors);
    const errDiv = document.createElement("div");
    errDiv.style.cssText = "padding:8px 14px;color:#ff9800;font-size:11px;border-top:1px solid #333;";
    errDiv.textContent = `\u26a0 ${controlErrors.length} control(s) failed: ${controlErrors.slice(0, 3).join("; ")}`;
    paramsPanel.appendChild(errDiv);
  }

  if (pane && typeof pane.on === "function") {
    pane.on("change", () => {
      if (manualPaused && !probeMode && !previewSuperseded) {
        renderOneFrame(performance.now());
      }
    });
  }

  // Add Presets folder
  try {
    addPresetUI(pane);
  } catch (e) {
    console.warn("Preset UI failed:", e.message);
  }

  // Apply loaded preset values if available
  if (availablePresets[activePresetName]) {
    try { applyPreset(availablePresets[activePresetName]); } catch {}
  }
}

function applyDefaultForUniform(name, meta) {
  const defVal = meta.default;
  switch (meta.type) {
    case "float": uniformValues[name] = defVal ?? 0; break;
    case "int": uniformValues[name] = defVal ?? 0; break;
    case "bool": uniformValues[name] = defVal ?? false; break;
    case "color": uniformValues[name] = arrayToColor(defVal ?? [1, 1, 1], false); break;
    case "color_alpha": uniformValues[name] = arrayToColor(defVal ?? [1, 1, 1, 1], true); break;
    case "vec2": uniformValues[name] = { x: defVal?.[0] ?? 0, y: defVal?.[1] ?? 0 }; break;
    case "enum": uniformValues[name] = defVal ?? 0; break;
    default: uniformValues[name] = defVal ?? 0; break;
  }
}

function addControl(folder, item) {
  const { name, type, label, default: defVal, min, max, step, options } = item;
  uniformMeta[name] = item;

  let objKey = name;
  let params = {};

  switch (type) {
    case "float":
      uniformValues[name] = defVal ?? 0;
      params = { min: min ?? 0, max: max ?? 1, step: step ?? 0.01, label: label || name };
      folder.addInput(uniformValues, name, params);
      break;

    case "int":
      uniformValues[name] = defVal ?? 0;
      params = { min: min ?? 0, max: max ?? 10, step: step ?? 1, label: label || name };
      folder.addInput(uniformValues, name, params);
      break;

    case "bool":
      uniformValues[name] = defVal ?? false;
      folder.addInput(uniformValues, name, { label: label || name });
      break;

    case "color":
      // Convert [r,g,b] array to {r,g,b} object
      uniformValues[name] = arrayToColor(defVal ?? [1, 1, 1], false);
      folder.addInput(uniformValues, name, {
        label: label || name,
        color: { type: "float" },
      });
      break;

    case "color_alpha":
      uniformValues[name] = arrayToColor(defVal ?? [1, 1, 1, 1], true);
      folder.addInput(uniformValues, name, {
        label: label || name,
        color: { type: "float", alpha: true },
      });
      break;

    case "vec2":
      uniformValues[name] = { x: (defVal?.[0]) ?? 0, y: (defVal?.[1]) ?? 0 };
      folder.addInput(uniformValues[name], "x", {
        label: label ? `${label} X` : `${name}.x`,
        min: min?.[0] ?? -1, max: max?.[0] ?? 1, step: step ?? 0.01,
      });
      folder.addInput(uniformValues[name], "y", {
        label: label ? `${label} Y` : `${name}.y`,
        min: min?.[1] ?? -1, max: max?.[1] ?? 1, step: step ?? 0.01,
      });
      break;

    case "enum":
      uniformValues[name] = defVal ?? 0;
      folder.addInput(uniformValues, name, {
        label: label || name,
        options: options || {},
      });
      break;

    default:
      console.warn(`Unknown param type: ${type} for ${name}`);
      break;
  }
}

function addPresetUI(rootPane) {
  presetFolder = rootPane.addFolder({ title: "Presets" });

  // Preset selector dropdown
  const presetNames = Object.keys(availablePresets);
  const presetOpts = {};
  for (const n of presetNames) presetOpts[n] = n;
  if (Object.keys(presetOpts).length === 0) presetOpts["(none)"] = "(none)";

  const presetState = { selected: activePresetName || "(none)" };
  presetSelect = presetFolder.addInput(presetState, "selected", {
    label: "Load",
    options: presetOpts,
  });
  presetSelect.on("change", (ev) => {
    if (ev.value && ev.value !== "(none)" && availablePresets[ev.value]) {
      applyPreset(availablePresets[ev.value]);
      activePresetName = ev.value;
    }
  });

  // Preset name input
  const nameState = { name: activePresetName || "" };
  presetNameInput = presetFolder.addInput(nameState, "name", { label: "Name" });

  // Save button
  presetFolder.addButton({ title: "Save Preset" }).on("click", () => {
    const name = nameState.name || "default";
    saveCurrentPreset(name);
  });

  // Delete button
  presetFolder.addButton({ title: "Delete Preset" }).on("click", async () => {
    const selected = presetState.selected;
    if (!selected || selected === "(none)") return;
    await deletePreset(selected);
  });

  // Reset to defaults
  presetFolder.addButton({ title: "Reset Defaults" }).on("click", () => {
    resetToDefaults();
  });
}

// ─── Value conversion helpers ────────────────────────────────

function arrayToColor(arr, hasAlpha) {
  if (!arr || !Array.isArray(arr)) {
    return hasAlpha ? { r: 1, g: 1, b: 1, a: 1 } : { r: 1, g: 1, b: 1 };
  }
  if (hasAlpha) return { r: arr[0] ?? 1, g: arr[1] ?? 1, b: arr[2] ?? 1, a: arr[3] ?? 1 };
  return { r: arr[0] ?? 1, g: arr[1] ?? 1, b: arr[2] ?? 1 };
}

function colorToArray(v, hasAlpha) {
  if (typeof v === "object" && v !== null) {
    if (hasAlpha) return [v.r ?? 1, v.g ?? 1, v.b ?? 1, v.a ?? 1];
    return [v.r ?? 1, v.g ?? 1, v.b ?? 1];
  }
  return hasAlpha ? [1, 1, 1, 1] : [1, 1, 1];
}

/** Get a uniform value in WebGL-ready format from the Tweakpane state */
function getUniformValue(name) {
  const v = uniformValues[name];
  const meta = uniformMeta[name];
  if (!meta || v === undefined) return null;

  switch (meta.type) {
    case "color":      return colorToArray(v, false);
    case "color_alpha": return colorToArray(v, true);
    case "vec2":       return [v.x ?? 0, v.y ?? 0];
    default:           return v; // float, int, bool, enum
  }
}

function getUniformGLType(meta) {
  switch (meta.type) {
    case "float":       return "float";
    case "int":
    case "enum":        return "int";
    case "bool":        return "bool";
    case "color":       return "vec3";
    case "color_alpha": return "vec4";
    case "vec2":        return "vec2";
    case "vec3":        return "vec3";
    default:            return null;
  }
}

// ─── Preset management ──────────────────────────────────────

async function fetchAndLoadPresets() {
  try {
    const resp = await fetch(`/api/presets?path=${encodeURIComponent(currentShaderPath)}`);
    if (!resp.ok) return;
    const json = await resp.json();
    availablePresets = json.presets || {};
    if (json.active && availablePresets[json.active]) {
      activePresetName = json.active;
    }
    // Apply active preset values
    if (availablePresets[activePresetName]) {
      applyPreset(availablePresets[activePresetName]);
    }
  } catch (e) {
    console.warn("Could not load presets:", e.message);
  }
}

function applyPreset(presetValues) {
  activePresetName = presetValues._name || activePresetName;
  for (const [name, value] of Object.entries(presetValues)) {
    if (name.startsWith("_")) continue;
    const meta = uniformMeta[name];
    if (!meta || uniformValues[name] === undefined) continue;

    switch (meta.type) {
      case "color":
        uniformValues[name] = arrayToColor(value, false);
        break;
      case "color_alpha":
        uniformValues[name] = arrayToColor(value, true);
        break;
      case "vec2":
        if (Array.isArray(value)) uniformValues[name] = { x: value[0] ?? 0, y: value[1] ?? 0 };
        break;
      default:
        uniformValues[name] = value;
    }
  }
  if (pane) pane.refresh();
  if (manualPaused && !probeMode && !previewSuperseded) renderOneFrame(performance.now());
}

function resetToDefaults() {
  for (const [name, meta] of Object.entries(uniformMeta)) {
    const defVal = meta.default;
    if (defVal === undefined) continue;
    switch (meta.type) {
      case "color":
        uniformValues[name] = arrayToColor(defVal, false);
        break;
      case "color_alpha":
        uniformValues[name] = arrayToColor(defVal, true);
        break;
      case "vec2":
        if (Array.isArray(defVal)) uniformValues[name] = { x: defVal[0] ?? 0, y: defVal[1] ?? 0 };
        break;
      default:
        uniformValues[name] = defVal;
    }
  }
  if (pane) pane.refresh();
  if (manualPaused && !probeMode && !previewSuperseded) renderOneFrame(performance.now());
}

async function saveCurrentPreset(presetName) {
  if (!currentShaderPath) return;
  const values = {};
  for (const [name, meta] of Object.entries(uniformMeta)) {
    const v = getUniformValue(name);
    if (v !== null) values[name] = v;
  }

  try {
    const resp = await fetch("/api/presets/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shader_path: currentShaderPath,
        preset_name: presetName,
        values,
      }),
    });
    if (resp.ok) {
      activePresetName = presetName;
      availablePresets[presetName] = values;
      console.log(`Preset "${presetName}" saved`);
      // Refresh preset dropdown
      rebuildPresetDropdown();
    }
  } catch (e) {
    console.error("Failed to save preset:", e.message);
  }
}

async function deletePreset(presetName) {
  if (!currentShaderPath || !presetName) return;

  try {
    const resp = await fetch("/api/presets/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shader_path: currentShaderPath,
        preset_name: presetName,
      }),
    });

    if (!resp.ok) {
      console.warn(`Failed to delete preset \"${presetName}\"`);
      return;
    }

    delete availablePresets[presetName];
    if (activePresetName === presetName) {
      const names = Object.keys(availablePresets);
      activePresetName = availablePresets.default ? "default" : (names[0] || "default");
      if (availablePresets[activePresetName]) {
        applyPreset(availablePresets[activePresetName]);
      } else {
        resetToDefaults();
      }
    }

    rebuildPresetDropdown();
    if (manualPaused && !probeMode && !previewSuperseded) renderOneFrame(performance.now());
  } catch (e) {
    console.error("Failed to delete preset:", e.message);
  }
}

function rebuildPresetDropdown() {
  if (!presetFolder || !pane) return;
  
  // We need to rebuild the preset folder since Tweakpane doesn't support
  // dynamic dropdown updates. Remove old folder and recreate.
  try { presetFolder.dispose(); } catch {}
  presetFolder = null;
  presetSelect = null;
  presetNameInput = null;

  addPresetUI(pane);
}

function updatePlayPauseButton() {
  if (!playPauseBtn || probeMode) return;
  playPauseBtn.textContent = manualPaused ? "Play" : "Pause";
  playPauseBtn.classList.toggle("paused", manualPaused);
}

function stopLiveLoop() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

function startLiveLoop() {
  if (animFrameId !== null || previewSuperseded || probeMode || manualPaused || document.hidden) return;
  animFrameId = requestAnimationFrame(loop);
}

function togglePlayPause() {
  if (probeMode || previewSuperseded) return;
  manualPaused = !manualPaused;

  if (manualPaused) {
    manualPausedStartedAt = performance.now();
    stopLiveLoop();
    renderOneFrame(performance.now());
  } else {
    if (manualPausedStartedAt > 0) {
      const pausedDelta = performance.now() - manualPausedStartedAt;
      startTime += pausedDelta;
      lastTime = performance.now();
      fpsLastTime = performance.now();
      manualPausedStartedAt = 0;
    }
    startLiveLoop();
  }

  updatePlayPauseButton();
}

function supersedePreview(newShader) {
  if (previewSuperseded) return;
  previewSuperseded = true;
  stopLiveLoop();
  if (shaderPollInterval) clearInterval(shaderPollInterval);
  if (paramsPollInterval) clearInterval(paramsPollInterval);
  shaderPollInterval = null;
  paramsPollInterval = null;
  showError(`Preview desactivado para ahorrar recursos.\n\nSe abrió un shader nuevo: ${newShader}\n\nPuedes cerrar esta pestaña.`);
  setCompileStatus("stale", "Superseded");
  if (playPauseBtn) {
    playPauseBtn.disabled = true;
    playPauseBtn.textContent = "Superseded";
  }
}

// ─── Single-frame render (probe mode) ─────────────────────
function renderOneFrame(now) {
  if (!gl || !program) return;

  const time = (now - startTime) / 1000;
  const delta = 0.016;

  gl.useProgram(program);
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Explicit clear to black
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Base uniforms
  setUniform("u_resolution", [canvas.width, canvas.height], "vec2");
  setUniform("u_time", time, "float");
  setUniform("u_delta", delta, "float");
  setUniform("u_frame", 0, "int");
  setUniform("u_mouse", [canvas.width / 2, canvas.height / 2], "vec2");

  if (shaderMode === "shadertoy") {
    setUniform("iResolution", [canvas.width, canvas.height, 1.0], "vec3");
    setUniform("iTime", time, "float");
    setUniform("iTimeDelta", delta, "float");
    setUniform("iFrame", 0, "int");
    setUniform("iMouse", [canvas.width / 2, canvas.height / 2, 0, 0], "vec4");
  }

  // Custom uniforms
  for (const [name, meta] of Object.entries(uniformMeta)) {
    const value = getUniformValue(name);
    const glType = getUniformGLType(meta);
    if (value !== null && glType) setUniform(name, value, glType);
  }

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  timeEl.textContent = `t=${time.toFixed(2)}s`;
  frameCountEl.textContent = "1";
}
function loop(now) {
  if (previewSuperseded || document.hidden) {
    animFrameId = null;
    return;
  }

  animFrameId = requestAnimationFrame(loop);
  if (!gl || !program) return;

  const time = (now - startTime) / 1000;
  const delta = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  frameCount++;

  fpsFrames++;
  if (now - fpsLastTime >= 1000) {
    currentFps = Math.round(fpsFrames / ((now - fpsLastTime) / 1000));
    fpsFrames = 0;
    fpsLastTime = now;
    fpsEl.textContent = `${currentFps} FPS`;
  }

  gl.useProgram(program);
  gl.viewport(0, 0, canvas.width, canvas.height);

  // Explicit clear to black
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Base uniforms
  setUniform("u_resolution", [canvas.width, canvas.height], "vec2");
  setUniform("u_time", time, "float");
  setUniform("u_delta", delta, "float");
  setUniform("u_frame", frameCount, "int");
  setUniform("u_mouse", [mouseX, mouseY], "vec2");
  if (hasUniform("u_mouse_down")) {
    setUniform("u_mouse_down", mouseDown ? 1 : 0, "bool");
  }

  // Shadertoy uniforms
  if (shaderMode === "shadertoy") {
    setUniform("iResolution", [canvas.width, canvas.height, 1.0], "vec3");
    setUniform("iTime", time, "float");
    setUniform("iTimeDelta", delta, "float");
    setUniform("iFrame", frameCount, "int");
    setUniform("iMouse", [mouseX, mouseY, mouseDown ? mouseX : 0, mouseDown ? mouseY : 0], "vec4");
  }

  // Custom uniforms from Tweakpane
  for (const [name, meta] of Object.entries(uniformMeta)) {
    const value = getUniformValue(name);
    const glType = getUniformGLType(meta);
    if (value !== null && glType) {
      setUniform(name, value, glType);
    }
  }

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  timeEl.textContent = `t=${time.toFixed(2)}s`;
  frameCountEl.textContent = frameCount;
}

// ─── Uniform helpers ─────────────────────────────────────────
function getUniformLocation(name) {
  if (!program) return null;
  return gl.getUniformLocation(program, name);
}

function hasUniform(name) {
  return getUniformLocation(name) !== null;
}

function setUniform(name, value, type) {
  const loc = getUniformLocation(name);
  if (loc === null) return;
  switch (type) {
    case "float": gl.uniform1f(loc, value); break;
    case "int":
    case "bool": gl.uniform1i(loc, value); break;
    case "vec2": gl.uniform2f(loc, value[0], value[1]); break;
    case "vec3": gl.uniform3f(loc, value[0], value[1], value[2]); break;
    case "vec4": gl.uniform4f(loc, value[0], value[1], value[2], value[3]); break;
  }
}

// ─── Hot reload polling ─────────────────────────────────────
async function pollShader() {
  if (!currentShaderPath) return;
  try {
    const resp = await fetch(`/api/shader?path=${encodeURIComponent(currentShaderPath)}`);
    if (!resp.ok) return;
    const source = await resp.text();
    if (source !== lastShaderFetch) {
      console.log("Shader changed, recompiling...");
      lastShaderFetch = source;
      shaderSource = source;
      compileShader(source);
    }
  } catch { /* ignore */ }
}

async function pollParams() {
  if (!currentShaderPath) return;
  try {
    const resp = await fetch(`/api/params?path=${encodeURIComponent(currentShaderPath)}`);
    if (!resp.ok) return;
    const text = await resp.text();
    if (text !== lastParamsFetch) {
      console.log("Params changed, rebuilding UI...");
      lastParamsFetch = text;
      const json = JSON.parse(text);
      // Preserve current values where uniform names match
      const savedValues = {};
      for (const [name, meta] of Object.entries(uniformMeta)) {
        savedValues[name] = getUniformValue(name);
      }
      buildParamsUI(json);
      // Restore saved values for uniforms that still exist
      for (const [name, value] of Object.entries(savedValues)) {
        if (uniformMeta[name] && value !== null) {
          switch (uniformMeta[name].type) {
            case "color":
              uniformValues[name] = { r: value[0], g: value[1], b: value[2] };
              break;
            case "color_alpha":
              uniformValues[name] = { r: value[0], g: value[1], b: value[2], a: value[3] };
              break;
            case "vec2":
              uniformValues[name] = { x: value[0], y: value[1] };
              break;
            default:
              uniformValues[name] = value;
          }
        }
      }
      if (pane) pane.refresh();
    }
  } catch { /* ignore */ }
}

// ─── UI helpers ──────────────────────────────────────────────
function showError(msg) {
  errorOverlay.textContent = msg;
  errorOverlay.classList.remove("hidden");
}

function hideError() {
  errorOverlay.classList.add("hidden");
}

function setCompileStatus(status, text) {
  compileStatusEl.textContent = text;
  compileStatusEl.className = `status-${status}`;
  document.body.setAttribute("data-shader-ready", status === "ok" ? "ok" : "error");
}

// ─── Startup ─────────────────────────────────────────────────
init();
