# GLSL Shader Vision

Visor WebGL local para shaders GLSL `.frag`, integrado como extensión de [Pi Agent](https://pi.dev). Permite visualizar, animar, ajustar parámetros y generar evidencia visual sin salir del terminal.

## Qué hace

- **Preview animado** de fragment shaders con WebGL
- **Controles UI** generados desde `.params.json` (sliders, colores, checkboxes, dropdowns)
- **Presets** para guardar y alternar variantes visuales
- **Hot reload** al editar `.frag` o `.params.json`
- **Modo Shadertoy** — detecta `mainImage()` y lo envuelve automáticamente
- **Probe sheets** — capturas en tiempos fijos con Puppeteer
- **Canvas configurable** — ratios 1:1, 16:9, 4:3, 9:16, Fit + tamaño máximo
- **Play / Pause** manual, auto-pausa si la pestaña queda oculta
- **Errores GLSL** visibles sobre el canvas

## Instalación

```bash
git clone <repo>
cd glsl-shader-vision
cd .pi/extensions/glsl-shader-vision && npm install
```

La extensión se auto-descubre al abrir Pi en este proyecto. Para recargar tras cambios: `/reload`.

## Uso

### Comandos (vos)

```txt
/glsl-open examples/shaders/pool_wave.frag    → abre preview animado
/glsl-probe examples/shaders/pool_wave.frag   → genera URLs de captura
/glsl-state examples/shaders/pool_wave.frag   → estado del server/shader
```

### Herramientas (el agente las llama solo)

| Tool | Descripción |
|---|---|
| `open_glsl_shader_preview` | Abre preview WebGL y devuelve URL |
| `render_glsl_shader_probe` | Genera contact sheet PNG |
| `read_glsl_shader_state` | Estado del shader/servidor |
| `save_glsl_shader_preset` | Guarda valores como preset |

## Ejemplos

| Shader | Descripción |
|---|---|
| `pool_wave.frag` | Agua con celdas Voronoi, 3 capas, ruido, pixelado — **14 controles, 3 presets** |
| `pixel_sea.frag` | Mar pixel art retro con ondas |
| `water.frag` | Agua con caustics y FBM |
| `magic_orb.frag` | Orbe mágico animado |

## Estructura

```
.pi/
├── extensions/glsl-shader-vision/
│   ├── index.ts              ← Extensión Pi
│   ├── package.json
│   ├── preview-server.mjs    ← Servidor HTTP + API
│   ├── scripts/render-probe.mjs  ← Puppeteer probe
│   └── public/               ← Viewer HTML/JS/CSS
├── skills/glsl-shader-vision/
│   └── SKILL.md              ← Instrucciones para el agente
└── glsl-shader-vision/
    └── output/               ← Probe sheets generados

examples/shaders/             ← Shaders de ejemplo
docs/                         ← Especificación y plan
```

## Contrato de archivos

Para `nombre.frag`:

```
nombre.frag           ← Shader GLSL
nombre.params.json    ← Controles UI
nombre.presets.json   ← Variantes guardadas
```

Sin `.params.json` el shader igual funciona con uniforms base (`u_time`, `u_resolution`, `u_mouse`).

## Requisitos

- Node.js ≥ 18
- Chrome/Edge para el viewer (WebGL)
- Puppeteer para probe sheets (se instala con `npm install`)

## No incluido

- Porting automático a Godot/WGSL/HLSL/Unity
- WebGPU
- Multipass Shadertoy (Buffers)
- Editor de código integrado
