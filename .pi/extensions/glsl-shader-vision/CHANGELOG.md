# Changelog

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
