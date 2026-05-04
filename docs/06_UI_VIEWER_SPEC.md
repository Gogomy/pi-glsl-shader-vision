# UI Viewer Spec

## Layout recomendado

```txt
┌──────────────────────────────────────────────────────────────┐
│ GLSL Shader Vision                                           │
├───────────────────────────────────────┬──────────────────────┤
│                                       │ Shader               │
│                                       │ - path               │
│             Canvas WebGL              │ - compile status     │
│             animado                   │ - FPS                │
│                                       │ - time/frame         │
│                                       ├──────────────────────┤
│                                       │ Parameters           │
│                                       │ - sliders            │
│                                       │ - colors             │
│                                       │ - toggles            │
│                                       │ - dropdowns          │
├───────────────────────────────────────┴──────────────────────┤
│ Error overlay / log / actions                                 │
└──────────────────────────────────────────────────────────────┘
```

## Controles mínimos

### Playback

- Pause/Play.
- Reset time.
- Time scale.
- Manual time scrubber opcional.

### Canvas

- Resolution preset: 256, 512, 768, 1024.
- Fit to window.
- Pixel perfect toggle opcional.
- Background checker opcional si se usa alpha.

### Parámetros

- Folders por `group` desde `.params.json`.
- Sliders numéricos.
- Checkboxes booleanos.
- Color picker para `color` y `color_alpha`.
- Dropdown para `enum`.
- Reset uniform individual.
- Reset all to defaults.

### Presets

- Select preset.
- Save current as preset.
- Overwrite active preset.
- Duplicate preset.
- Delete preset con confirmación.

### Export

- Capture PNG actual.
- Generate probe sheet.
- Export short video opcional.

## Overlay de errores

Cuando el shader falla:

- El canvas no debe quedar negro sin explicación.
- Mostrar compile/link error arriba del canvas.
- Conservar último frame válido si existe, pero marcarlo como stale.
- Incluir timestamp de último intento.

Ejemplo:

```txt
Fragment shader compile error
ERROR: 0:42: 'uvv' : undeclared identifier
```

## Estado visual

Indicadores:

```txt
Compile OK     verde
Compile Error  rojo
Warning        amarillo
Stale Preview  gris/amarillo
```

## Hot reload

Al guardar `shader.frag`:

1. Releer archivo.
2. Recompilar fragment shader.
3. Si compila, reemplazar programa WebGL.
4. Si falla, mostrar error y conservar programa anterior si existe.

Al guardar `.params.json`:

1. Releer metadata.
2. Reconstruir panel UI.
3. Mantener valores actuales donde nombres coincidan.
4. Aplicar defaults para nuevos uniforms.

Al guardar `.presets.json`:

1. Actualizar lista de presets.
2. No cambiar preset activo salvo que el archivo indique `active` diferente.

## Mapeo UI → WebGL uniforms

| Tipo schema | GLSL esperado | WebGL call |
|---|---|---|
| `float` | `uniform float` | `uniform1f` |
| `int` | `uniform int` | `uniform1i` |
| `bool` | `uniform bool` | `uniform1i` |
| `vec2` | `uniform vec2` | `uniform2f` |
| `vec3` | `uniform vec3` | `uniform3f` |
| `vec4` | `uniform vec4` | `uniform4f` |
| `color` | `uniform vec3` | `uniform3f` |
| `color_alpha` | `uniform vec4` | `uniform4f` |
| `enum` | `uniform int` | `uniform1i` |

## Requisito de usabilidad

El visor debe ser útil aunque el agente no esté mirando. El usuario debe poder abrirlo, ajustar sliders y guardar presets sin intervención del agente.
