# Bug: GLSL Shader Vision — desajuste de rutas

## Fecha
2026-05-13

## Síntoma

Al usar `open_glsl_shader_preview` con un archivo `.frag` del proyecto, el servidor de preview responde **404 "Shader not found"** aunque el archivo exista.

## Causa raíz

La herramienta `open_glsl_shader_preview` (definida en `index.ts` del paquete `pi-glsl-shader-vision`) resuelve la ruta del shader contra el **directorio de trabajo del proyecto** (`ctx.cwd`), pero el servidor HTTP (`preview-server.mjs`) resuelve todas las rutas contra su propio `PROJECT_ROOT`, que está hardcodeado como el **directorio de instalación del paquete**.

### Flujo actual (roto)

```
index.ts:
  resolved = resolveShaderPath(ctx.cwd, "buff_test.frag")
           = "D:/.../GM/buff_test.frag"
  relPath  = path.relative(ctx.cwd, resolved)
           = "buff_test.frag"
  url      = "?shader=buff_test.frag"        ← relativo al proyecto

preview-server.mjs:
  PROJECT_ROOT = __dirname                    ← C:/.../node_modules/.../pi-glsl-shader-vision/
  resolveShaderPath("buff_test.frag")
    = path.resolve(PROJECT_ROOT, "buff_test.frag")
    = "C:/.../pi-glsl-shader-vision/buff_test.frag"  ← NO EXISTE → 404
```

### Flujo esperado

El servidor debería recibir el `cwd` del proyecto y resolver las rutas contra él, no contra su propio `__dirname`.

## Archivos involucrados

| Archivo | Rol |
|---|---|
| `C:/.../pi-glsl-shader-vision/index.ts` | Define la tool `open_glsl_shader_preview`. Pasa `relPath` relativo al proyecto. |
| `C:/.../pi-glsl-shader-vision/preview-server.mjs` | Servidor HTTP. `PROJECT_ROOT` hardcodeado como `__dirname`. |

## Solución temporal

Copiar el `.frag` a `examples/shaders/` dentro del paquete y usar la ruta relativa al paquete:

```bash
cp <proyecto>/shader.frag <npm-global>/@gogomi/pi-glsl-shader-vision/examples/shaders/
# URL: ?shader=examples/shaders/shader.frag
```

## Solución aplicada (2026-05-13)

### `preview-server.mjs`
- `PROJECT_ROOT` ahora es `process.cwd()` (fallback) en lugar de `__dirname`.
- Se añadió `PROJECT_ROOT_OVERRIDE` y `getProjectRoot()`, que devuelve el override si existe, o `PROJECT_ROOT` en su defecto.
- `resolveShaderPath()` ahora acepta **rutas absolutas** además de relativas:
  - Relativas → resueltas contra `getProjectRoot()` (el proyecto del usuario).
  - Absolutas → verificadas contra `getProjectRoot()` **o** `__dirname` (shaders bundled del paquete).
- `startServer()` acepta un segundo parámetro `projectRoot` que sobreescribe `PROJECT_ROOT_OVERRIDE`.
- CLI `--cwd <path>` ahora configurable desde línea de comandos.
- Export cambió de `PROJECT_ROOT` a `getProjectRoot`.

### `index.ts`
- `ensureServer()` acepta `cwd?: string` y lo pasa a `startServer()`.
- Todos los handlers (`glsl-open`, `glsl-test`, `glsl-probe`, `open_glsl_shader_preview`) pasan `ctx.cwd`.
- `glsl-test` ahora usa `BUNDLED_TEST_SHADER_ABS` (ruta absoluta) en la URL, que el servidor resuelve contra `__dirname`.
- `render_glsl_shader_probe` tool pasa `projectRoot: ctx.cwd` a `renderProbe()`.

### `render-probe.mjs`
- `renderProbe()` acepta `options.projectRoot` y lo pasa a `startServer()`.
