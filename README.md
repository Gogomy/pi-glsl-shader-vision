# GLSL Shader Vision — Pi Extension

[![npm](https://img.shields.io/npm/v/@gogomi/pi-glsl-shader-vision)](https://www.npmjs.com/package/@gogomi/pi-glsl-shader-vision)

Local WebGL viewer for GLSL `.frag` fragment shaders, integrated as a [Pi Agent](https://pi.dev) extension. Preview, animate, tweak uniforms, and generate visual evidence — all without leaving the terminal.

## Features

- **Animated WebGL preview** of fragment shaders
- **UI controls** generated from `.params.json` (sliders, colors, checkboxes, dropdowns)
- **Presets** to save and switch between visual variants
- **Hot reload** when editing `.frag` or `.params.json`
- **Shadertoy mode** — auto-detects `mainImage()` and wraps it
- **Probe sheets** — timed captures via Puppeteer headless Chrome
- **Configurable canvas** — ratios: 1:1, 16:9, 4:3, 9:16, Fit + max size
- **Play/Pause** with auto-pause on hidden tabs
- **GLSL errors** shown as overlay on the canvas

## Install

```bash
pi install npm:@gogomi/pi-glsl-shader-vision
```

Or manually:

```bash
git clone https://github.com/Gogomy/pi-glsl-shader-vision.git
cd pi-glsl-shader-vision
npm install
```

Reload Pi after install: `/reload`

## Usage

### Slash Commands (you)

```txt
/glsl-open examples/shaders/pool_wave.frag    → open animated preview
/glsl-probe examples/shaders/pool_wave.frag   → generate capture URLs
/glsl-state examples/shaders/pool_wave.frag   → server/shader status
```

### Agent Tools (called automatically by the agent)

| Tool                       | Description                       |
| -------------------------- | --------------------------------- |
| `open_glsl_shader_preview` | Open WebGL preview and return URL |
| `render_glsl_shader_probe` | Generate contact sheet PNG        |
| `read_glsl_shader_state`   | Check shader/server state         |
| `save_glsl_shader_preset`  | Save uniform values as preset     |

## Examples

| Shader           | Description                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| `pool_wave.frag` | Voronoi-based water, 3 layers, noise, pixelated — **14 controls, 3 presets** |

## Structure

```
index.ts                     ← Pi extension (commands + tools)
preview-server.mjs           ← HTTP server + API + chokidar hot reload
public/                      ← Viewer HTML/JS/CSS (WebGL + Tweakpane)
scripts/render-probe.mjs     ← Puppeteer headless probe
skills/glsl-shader-vision/
  SKILL.md                   ← Agent skill
examples/shaders/            ← Example shaders (.frag + .params + .presets)
docs/                        ← Spec and plan
```

## File Contract

For `shader.frag`:

```
shader.frag           ← GLSL shader
shader.params.json    ← UI controls
shader.presets.json   ← Saved variants
```

Without `.params.json`, the shader still works with base uniforms (`u_time`, `u_resolution`, `u_mouse`).

## Requirements

- Node.js ≥ 18
- Chrome/Edge for the viewer (WebGL)
- Puppeteer for probe sheets (installed with `npm install`)
