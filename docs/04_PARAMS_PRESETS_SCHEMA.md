# Params & Presets Schema

## Archivos esperados

Para un shader:

```txt
magic_orb.frag
magic_orb.params.json
magic_orb.presets.json
```

`magic_orb.params.json` define la UI y defaults.  
`magic_orb.presets.json` guarda configuraciones aprobadas.

## Schema base de `.params.json`

```json
{
  "uniforms": {
    "u_glow": {
      "type": "float",
      "label": "Glow",
      "default": 0.35,
      "min": 0.0,
      "max": 2.0,
      "step": 0.01,
      "group": "Look"
    }
  }
}
```

## Tipos soportados en MVP

### Float

```json
{
  "type": "float",
  "label": "Speed",
  "default": 2.0,
  "min": 0.0,
  "max": 10.0,
  "step": 0.1
}
```

### Int

```json
{
  "type": "int",
  "label": "Octaves",
  "default": 4,
  "min": 1,
  "max": 8,
  "step": 1
}
```

### Bool

```json
{
  "type": "bool",
  "label": "Invert",
  "default": false
}
```

### Color vec3

```json
{
  "type": "color",
  "label": "Inner Color",
  "default": [0.25, 0.6, 1.0]
}
```

Debe mapearse a `vec3` en GLSL.

### Color vec4

```json
{
  "type": "color_alpha",
  "label": "Tint",
  "default": [1.0, 0.5, 0.2, 0.75]
}
```

Debe mapearse a `vec4` en GLSL.

### Vec2

```json
{
  "type": "vec2",
  "label": "Offset",
  "default": [0.0, 0.0],
  "min": [-1.0, -1.0],
  "max": [1.0, 1.0],
  "step": 0.01
}
```

### Enum

```json
{
  "type": "enum",
  "label": "Blend Mode",
  "default": 0,
  "options": {
    "Normal": 0,
    "Add": 1,
    "Multiply": 2
  }
}
```

En GLSL puede mapearse a `int`.

## Ejemplo completo

```json
{
  "version": 1,
  "uniforms": {
    "u_glow": {
      "type": "float",
      "label": "Glow",
      "default": 0.35,
      "min": 0.0,
      "max": 2.0,
      "step": 0.01,
      "group": "Look"
    },
    "u_speed": {
      "type": "float",
      "label": "Speed",
      "default": 2.0,
      "min": 0.0,
      "max": 10.0,
      "step": 0.1,
      "group": "Animation"
    },
    "u_color_a": {
      "type": "color",
      "label": "Inner Color",
      "default": [0.25, 0.6, 1.0],
      "group": "Color"
    },
    "u_color_b": {
      "type": "color",
      "label": "Outer Color",
      "default": [0.9, 0.3, 1.0],
      "group": "Color"
    }
  }
}
```

## Schema base de `.presets.json`

```json
{
  "version": 1,
  "active": "default",
  "presets": {
    "default": {
      "u_glow": 0.35,
      "u_speed": 2.0,
      "u_color_a": [0.25, 0.6, 1.0],
      "u_color_b": [0.9, 0.3, 1.0]
    }
  }
}
```

## Reglas de validación

- Todo uniform declarado en `.params.json` debería existir en el shader.
- Si existe en `.params.json` pero no en GLSL, mostrar warning, no error fatal.
- Si el shader declara un custom uniform sin metadata, no crear UI automática salvo que se agregue modo inferencia.
- Los defaults deben tener el tipo correcto.
- Los presets pueden contener solo subset de uniforms; faltantes usan defaults.
- Al guardar preset, preservar formato legible con indentación de 2 espacios.

## Inferencia opcional posterior

En una versión futura, el visor puede leer declaraciones GLSL:

```glsl
uniform float u_speed;
uniform vec3 u_color_a;
```

Y crear controles básicos automáticamente, pero sin `min/max/step` la UI será pobre. Por eso el archivo `.params.json` sigue siendo la fuente principal.
