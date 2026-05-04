# Arquitectura

## Vista general

```txt
Pi Agent
  │
  ├─ .pi/skills/glsl-shader-vision/SKILL.md
  │    └─ Instrucciones de uso para el agente
  │
  ├─ .pi/extensions/glsl-shader-vision/index.ts
  │    ├─ registerCommand('/glsl-open')
  │    ├─ registerCommand('/glsl-probe')
  │    ├─ registerTool('open_glsl_shader_preview')
  │    ├─ registerTool('render_glsl_shader_probe')
  │    └─ registerTool('read_glsl_shader_state')
  │
  └─ Viewer local
       ├─ preview-server.mjs
       ├─ public/index.html
       ├─ public/viewer.js
       ├─ public/style.css
       └─ scripts/render-probe.mjs
```

## Componentes

### 1. Pi Skill

La skill no ejecuta el visor por sí misma. Solo define cuándo usarlo, qué comprobar y qué no hacer.

Responsabilidades:

- Cargar instrucciones cuando el usuario trabaja con GLSL/shaders.
- Forzar validación visual después de editar `.frag`.
- Recordar que el porting queda fuera del visor.
- Indicar el contrato de archivos `.frag`, `.params.json`, `.presets.json`.

### 2. Pi Extension

La extensión es la parte operativa.

Responsabilidades:

- Registrar comandos slash.
- Registrar tools para el agente.
- Lanzar el servidor local.
- Ejecutar probe/export.
- Leer estado de compilación.
- Devolver rutas de artefactos generados.

### 3. Preview Server

Servidor local HTTP/WebSocket.

Responsabilidades:

- Servir `index.html`, `viewer.js`, `style.css`.
- Leer el shader desde el path indicado.
- Leer `.params.json` y `.presets.json`.
- Notificar cambios por WebSocket o polling.
- Persistir presets.
- Entregar estado de compilación.

### 4. WebGL Viewer

Responsabilidades:

- Crear canvas WebGL.
- Compilar vertex shader fijo + fragment shader del usuario.
- Dibujar fullscreen quad.
- Actualizar uniforms cada frame.
- Renderizar UI de parámetros con Tweakpane.
- Mostrar errores GLSL en overlay.
- Exportar canvas a PNG.

### 5. Probe Renderer

Puede usar Playwright/Chromium headless o reutilizar el viewer.

Responsabilidades:

- Renderizar el shader en varios tiempos fijos.
- Aplicar preset seleccionado.
- Crear una imagen contact sheet.
- Devolver ruta del PNG.

## Flujo de datos

```txt
shader.frag
shader.params.json
shader.presets.json
        │
        ▼
preview-server
        │
        ▼
viewer.js ── WebGL compile/link ── render loop
        │
        ├─ UI sliders → uniforms
        ├─ preset save/load → presets.json
        └─ capture/probe → PNG/WebM
```

## Decisiones técnicas

### WebGL primero

Motivo: acepta GLSL ES y es compatible con el objetivo de prototipar `.frag`. WebGPU no conviene como primera base porque usa WGSL, no GLSL.

### Fullscreen quad

El visor no necesita escena 3D. Para fragment shaders de pantalla completa se dibujan dos triángulos que cubren todo el canvas.

### Tweakpane para UI

Tweakpane es una librería ligera y sin dependencia de framework para sliders, colores, booleans, folders y presets. Es más apropiada que crear una UI desde cero.

### JSON externo para parámetros

`shader.params.json` es más estable que comentarios dentro del shader. El shader queda limpio y el agente puede editar el contrato de parámetros sin romper GLSL.
