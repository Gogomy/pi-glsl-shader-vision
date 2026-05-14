# Changelog

## 0.2.0 (2026-05-13)

### New feature: button trigger uniform

- **New `button` uniform type** — renders a clickable trigger button in the UI. When pressed, sets the uniform to the current shader time, allowing shaders to implement fire-and-forget animations with start/end (explosions, shockwaves, power-ups, transitions).
  - `public/viewer.js`: `case "button"` added to `addControl()`, `applyDefaultForUniform()`, `getUniformGLType()`, `applyPreset()`.
  - Default value `-1.0` (not triggered).
  - Auto-unpauses the viewer when pressed in paused mode.
  - Uses shader time (not wall-clock) for correct pause/resume behavior.
  - Buttons are excluded from presets (triggers, not state).

### New example: trigger_effect.frag

- **`examples/shaders/trigger_effect.frag`** — demonstrates two independent button triggers in the same shader:
  - **Burst A**: particle explosion, 20 particles flying outward with configurable speed, size, flash, and decay.
  - **Shockwave B**: expanding ring with trail, secondary ring, configurable width, speed, and flash.
  - **14 exposed uniforms** across 5 UI groups (Triggers, Timing, Burst params, Shockwave params).
  - Companion files: `trigger_effect.params.json`, `trigger_effect.presets.json`.

### Documentation

- **SKILL.md**: Added `button` to supported uniform types table with full documentation. Added "Trigger shader checklist" in Step 0. Added "Full parameter exposure" example section. Enforced "no magic numbers" rule.
- **README.md**: Added `trigger_effect` to examples table. Updated features list.

### Dev workflow

- **`.pi/extensions/glsl-shader-vision/index.ts`** — local development entry point so pi loads the extension from the repo instead of the global npm package. Editing `viewer.js` and `preview-server.mjs` in the repo now reflects immediately.
- **`preview-server.mjs`** — auto-detects repo's `public/` directory at startup, falling back to bundled files.

## 0.1.11 (2026-05-13)

### Skill improvements (post-mortem from shader-error-report.md)

- **Added `precision highp float;`** to the Base uniforms Local mode template — WebGL fragment shaders require it, and omitting it was the #1 compile error for new shaders.
- **Expanded Workflow** into 4 steps:
  - Step 0 — Before writing: decide what the user can control, plan uniforms and params.
  - Step 1 — Write and open: compile loop.
  - Step 2 — Verify interactivity: confirm `.params.json` exists, every custom uniform has a control.
  - Step 3 — Visual evidence and report.
- **Added Minimal complete example** section with a 15-line `example.frag` + `example.params.json` showing the full contract (`precision`, uniforms, params, groups).
- **Added reference** to `examples/shaders/pool_wave.frag` for complex multi-uniform shaders.
- Removed obsolete `glsl-shader-vision-bug.md` (superseded by `shader-error-report.md`).

## 0.1.8 (2026-05-13)

### Bug fix

- **Fixed 404 "Shader not found"** — el servidor de preview resolvía rutas contra su propio `__dirname` en lugar del directorio del proyecto (`ctx.cwd`). Ahora acepta `projectRoot` configurable y también rutas absolutas para shaders bundled.
  - `preview-server.mjs`: `resolveShaderPath()` ahora usa `getProjectRoot()` dinámico y acepta rutas absolutas con verificación de seguridad.
  - `index.ts`: `ensureServer()` pasa `ctx.cwd` al servidor. `glsl-test` usa ruta absoluta para el shader bundled.
  - `render-probe.mjs`: acepta `projectRoot` y lo pasa a `startServer()`.
  - Ver `glsl-shader-vision-bug.md` para el reporte completo.

## 0.1.7 (2026-05-04)

### Canvas presets

- Removed `Fit` canvas option from viewer presets.
- Set default canvas ratio to `1:1`.

## 0.1.6 (2026-05-04)

### Preset management

- Added preset deletion in viewer (`Delete Preset` button).
- Added server endpoint `POST /api/presets/delete`.
- Removed `cascada` preset from bundled `pool_wave.presets.json` and set active preset to `default`.

## 0.1.5 (2026-05-04)

### UX command

- Added `/glsl-test` command to open bundled `pool_wave` example directly from the installed npm package (no manual path needed).

## 0.1.4 (2026-05-04)

### npm package fix

- Added `examples/shaders/pool_wave.*` to `package.json` `files` so the sample shader is included when installing from npm.

## 0.1.3 (2026-05-04)

### Example cleanup

- Removed all example shaders except `examples/shaders/pool_wave.*`
- Updated README examples section to keep only `pool_wave.frag`

## 0.1.0 (2026-05-04)

### MVP inicial

- **Viewer WebGL** — fullscreen quad animado con `requestAnimationFrame`
- **Tweakpane UI** — sliders, colores, checkboxes, dropdowns desde `.params.json`
- **Presets** — guardar, cargar, alternar presets en `.presets.json`
- **Hot reload** — `.frag` y `.params.json` se recargan al guardar
- **Modo Shadertoy** — detección automática de `mainImage()` + wrapper
- **Play / Pause** — control manual y auto-pausa al ocultar la pestaña
- **Canvas ratio presets** — Fit, 1:1, 16:9, 4:3, 9:16 + tamaño máximo 640px
- **Errores GLSL** — overlay rojo con mensaje de compilación/linkeo
- **Extensión Pi** — 3 comandos (`/glsl-open`, `/glsl-probe`, `/glsl-state`) + 4 tools
- **Probe renderer** — Puppeteer headless Chrome, contact sheet PNG + metadata JSON
- **Skill del agente** — `glsl-shader-vision` con instrucciones de uso
- **Desactivación de previews viejos** — `BroadcastChannel` entre tabs
- **Shaders de ejemplo** — `pool_wave.frag` (14 controles, 3 presets), `pixel_sea.frag`, `water.frag`, `magic_orb.frag`

### 2026-05-04 (pre-release fixes)

- Corregidos errores TypeScript (`err as Error`, `details` en `onUpdate`, `.d.mts` para imports)
- Añadido `typescript@^6.0.3` como devDependency
- Corregido README: instrucciones de instalación y estructura real del proyecto
- Corregido `.gitignore`: `docs/` ya no se ignora (estaba mal)
- Declaraciones de tipos para `preview-server.mjs` y `render-probe.mjs`
