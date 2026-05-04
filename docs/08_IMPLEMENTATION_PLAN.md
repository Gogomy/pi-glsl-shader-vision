# Implementation Plan

## Fase 0 — Preparación

Objetivo: crear estructura de proyecto.

Tareas:

- Crear `.pi/extensions/glsl-shader-vision/`.
- Crear `.pi/skills/glsl-shader-vision/SKILL.md`.
- Crear `examples/`.
- Crear `docs/`.
- Instalar dependencias Node.

Dependencias sugeridas:

```json
{
  "dependencies": {
    "@tweakpane/core": "latest",
    "tweakpane": "latest",
    "ws": "latest",
    "chokidar": "latest",
    "playwright": "latest"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

Playwright solo es necesario para probe/export headless. El live viewer puede funcionar sin Playwright.

## Fase 1 — Viewer WebGL mínimo

Objetivo: abrir `.frag` y renderizarlo animado.

Tareas:

- Crear `public/index.html`.
- Crear `public/viewer.js`.
- Crear vertex shader fijo.
- Crear fullscreen quad.
- Cargar fragment shader desde endpoint HTTP.
- Compilar/linkear shader.
- Inyectar `u_resolution`, `u_time`, `u_delta`, `u_frame`, `u_mouse`.
- Render loop con `requestAnimationFrame`.
- Mostrar compile errors.

Aceptación:

- Un shader mínimo se renderiza animado.
- Un shader roto muestra error claro.

## Fase 2 — Preview Server

Objetivo: abrir un shader local por path.

Tareas:

- Crear `preview-server.mjs`.
- Endpoint `/shader?path=...`.
- Endpoint `/params?path=...`.
- Endpoint `/presets?path=...`.
- Endpoint `/save-preset`.
- Sanitizar paths.
- Watch con `chokidar` o polling.
- WebSocket para notificar cambios.

Aceptación:

- Cambiar `shader.frag` recarga preview.
- Cambiar `.params.json` reconstruye UI.

## Fase 3 — UI de parámetros

Objetivo: sliders y controles en tiempo real.

Tareas:

- Integrar Tweakpane.
- Parsear `.params.json`.
- Crear folders por `group`.
- Crear controles por tipo.
- Actualizar uniforms cada frame.
- Reset defaults.
- Guardar valores actuales como preset.

Aceptación:

- `u_glow` slider modifica el shader sin recompilar.
- Color picker modifica `vec3`/`vec4`.
- Presets se guardan en JSON.

## Fase 4 — Shadertoy mode

Objetivo: soportar `mainImage`.

Tareas:

- Detectar `void mainImage(`.
- Inyectar prelude Shadertoy.
- Envolver en `main()`.
- Mapear uniforms: `iResolution`, `iTime`, `iTimeDelta`, `iFrame`, `iMouse`.

Aceptación:

- Un shader Shadertoy simple compila sin editar manualmente.

## Fase 5 — Pi Extension

Objetivo: comandos y tools.

Tareas:

- Crear `index.ts`.
- Registrar `/glsl-open`.
- Registrar `/glsl-probe`.
- Registrar `/glsl-state`.
- Registrar tool `open_glsl_shader_preview`.
- Registrar tool `render_glsl_shader_probe`.
- Registrar tool `read_glsl_shader_state`.

Aceptación:

- Desde Pi se puede abrir preview.
- Desde Pi se puede generar probe.
- Desde Pi se puede leer estado de compilación.

## Fase 6 — Probe Renderer

Objetivo: evidencia visual para el agente.

Tareas:

- Usar Playwright para abrir viewer headless.
- Aplicar preset y tiempos específicos.
- Capturar canvas por cada tiempo.
- Combinar imágenes en contact sheet.
- Escribir metadata JSON junto al PNG.

Output:

```txt
.pi/glsl-shader-vision/output/magic_orb_probe_default.png
.pi/glsl-shader-vision/output/magic_orb_probe_default.json
```

Aceptación:

- Probe sheet muestra 5 tiempos.
- Metadata incluye shader path, preset, times, resolución y compile status.

## Fase 7 — Skill

Objetivo: que el agente sepa cuándo y cómo usar la extensión.

Tareas:

- Crear `SKILL.md` con descripción específica.
- Incluir reglas de workflow.
- Incluir comandos y tools.
- Incluir limitación: no porting.

Aceptación:

- Pi carga la skill cuando el usuario trabaja con GLSL/shaders.
- La descripción no es genérica.

## Fase 8 — Documentación y ejemplos

Objetivo: que el proyecto sea mantenible.

Tareas:

- Crear `examples/magic_orb.frag`.
- Crear params y presets de ejemplo.
- Documentar uso.
- Documentar troubleshooting.

Aceptación:

- Un usuario nuevo puede ejecutar el visor con el ejemplo.
