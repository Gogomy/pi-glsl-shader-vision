# Changelog

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
