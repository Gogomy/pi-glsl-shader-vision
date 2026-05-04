# Pi Extension Spec

## Ubicación recomendada

```txt
.pi/extensions/glsl-shader-vision/
├─ index.ts
├─ package.json
├─ preview-server.mjs
├─ scripts/
│  ├─ render-probe.mjs
│  └─ export-video.mjs
└─ public/
   ├─ index.html
   ├─ viewer.js
   └─ style.css
```

Pi auto-descubre extensiones TypeScript en `.pi/extensions/` (subdirectorio con `index.ts`). Se compilan con `jiti`, sin build step. Hot reload con `/reload`.

La extensión debe exportar una factory: `export default function (pi: ExtensionAPI)`. El `ctx` (ExtensionContext/ExtensionCommandContext) se recibe como parámetro en cada handler, no en la factory.

Los tool schemas usan **TypeBox**, no JSON Schema. Ver `node_modules/@mariozechner/pi-coding-agent/docs/extensions.md` para la API completa.

## Comandos slash

### `/glsl-open <shader.frag>`

Abre el visor animado.

Argumentos:

```txt
/glsl-open shaders/magic_orb.frag
/glsl-open shaders/magic_orb.frag --width 768 --height 768
/glsl-open shaders/magic_orb.frag --mode shadertoy
```

### `/glsl-probe <shader.frag>`

Genera contact sheet.

```txt
/glsl-probe shaders/magic_orb.frag --times 0,0.5,1,2,4 --preset default
```

### `/glsl-export <shader.frag>`

Exporta video corto.

```txt
/glsl-export shaders/magic_orb.frag --duration 4 --fps 30 --preset blue_magic
```

### `/glsl-state <shader.frag>`

Devuelve estado actual: server activo, último compile status, último error, preset activo.

## Tools para el agente

### `open_glsl_shader_preview`

Schema (TypeBox):

```ts
Type.Object({
  shader_path: Type.String({ description: "Path to .frag shader file" }),
  width: Type.Optional(Type.Number({ description: "Canvas width in pixels" })),
  height: Type.Optional(Type.Number({ description: "Canvas height in pixels" })),
  mode: Type.Optional(StringEnum(["auto", "local", "shadertoy"] as const)),
})
```

Output (tool result):

```json
{
  "ok": true,
  "url": "http://127.0.0.1:5177/?shader=...",
  "status_path": ".pi/glsl-shader-vision/state/magic_orb.status.json"
}
```

### `render_glsl_shader_probe`

Schema (TypeBox):

```ts
Type.Object({
  shader_path: Type.String({ description: "Path to .frag shader file" }),
  times: Type.Optional(Type.Array(Type.Number())),
  preset: Type.Optional(Type.String()),
  width: Type.Optional(Type.Number()),
  height: Type.Optional(Type.Number()),
})
```

Output (tool result):

```json
{
  "ok": true,
  "compile_ok": true,
  "image_path": ".pi/glsl-shader-vision/output/magic_orb_probe_default.png",
  "warnings": []
}
```

### `read_glsl_shader_state`

Schema (TypeBox):

```ts
Type.Object({
  shader_path: Type.String({ description: "Path to .frag shader file" }),
})
```

Output (tool result):

```json
{
  "ok": true,
  "compile_ok": false,
  "last_error": "Fragment shader compile error: ...",
  "active_preset": "default",
  "last_updated": "2026-05-03T00:00:00Z"
}
```

### `save_glsl_shader_preset`

Schema (TypeBox):

```ts
Type.Object({
  shader_path: Type.String({ description: "Path to .frag shader file" }),
  preset_name: Type.String({ description: "Name for the preset" }),
  values: Type.Record(Type.String(), Type.Unknown()),
})
```

Output (tool result):

```json
{
  "ok": true,
  "preset_path": "shaders/magic_orb.presets.json"
}
```

## Reglas de comportamiento

- Los comandos deben resolver paths relativos a `ctx.cwd`.
- Nunca crear archivos fuera del proyecto salvo caches temporales globales explícitos.
- Output generado debe ir en `.pi/glsl-shader-vision/output/`.
- Estado runtime debe ir en `.pi/glsl-shader-vision/state/`.
- Si falta `.params.json`, abrir igual el shader con uniforms base y mostrar aviso.
- Si falta `.presets.json`, crear uno al guardar primer preset.
- Si el servidor ya está activo, reutilizarlo.
- Si el puerto está ocupado, elegir el siguiente puerto disponible y reportarlo.

## Seguridad

- No permitir path traversal fuera del workspace.
- No ejecutar código arbitrario desde `.params.json`.
- Servir solo archivos dentro del workspace o la carpeta de extensión.
- Limitar tamaño de shader y assets.

## Errores esperados

| Error | Respuesta |
|---|---|
| Shader no existe | Error claro con path absoluto resuelto. |
| WebGL no disponible | Mostrar instrucciones para Chromium/flags. |
| GLSL compile error | Devolver log exacto. |
| Params JSON inválido | Mostrar línea/causa si es posible. |
| Uniform type no soportado | Warning y omitir control. |
