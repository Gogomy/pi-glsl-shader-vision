# Shader Contracts

El visor debe soportar dos contratos: `u_*` local y `Shadertoy-style`.

## Contrato recomendado: local `u_*`

Usar este contrato para shaders propios del proyecto.

```glsl
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_delta;
uniform int u_frame;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    gl_FragColor = vec4(uv, 0.5 + 0.5 * sin(u_time), 1.0);
}
```

### Uniforms base

| Uniform | Tipo | Descripción |
|---|---|---|
| `u_resolution` | `vec2` | Tamaño del canvas en píxeles. |
| `u_time` | `float` | Tiempo acumulado en segundos. |
| `u_delta` | `float` | Delta time del frame actual. |
| `u_frame` | `int` | Contador de frames. |
| `u_mouse` | `vec2` | Posición del mouse en píxeles. |
| `u_mouse_down` | `bool` opcional | Mouse presionado. Puede omitirse si se usa `u_mouse_buttons`. |
| `u_mouse_buttons` | `vec4` opcional | Estado extendido de mouse. |

## Contrato Shadertoy-style

Usar para shaders copiados/adaptados de Shadertoy.

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}
```

El viewer debe envolver automáticamente:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord);

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
```

### Uniforms Shadertoy mínimos

| Uniform | Tipo | Descripción |
|---|---|---|
| `iResolution` | `vec3` | Resolución del viewport. `xy` = canvas size. |
| `iTime` | `float` | Tiempo acumulado en segundos. |
| `iTimeDelta` | `float` | Delta del frame. |
| `iFrame` | `int` | Contador de frames. |
| `iMouse` | `vec4` | Mouse. `xy` posición actual, `zw` click origin. |
| `iChannel0..3` | `sampler2D` | Texturas/canales opcionales. No requeridos en MVP. |

## Selección automática de modo

El visor puede detectar modo así:

```txt
Si el shader contiene `void mainImage(` → Shadertoy mode.
Si contiene `void main(` → local WebGL mode.
Si contiene ambos → usar `main()` y advertir ambigüedad.
```

## Reglas para shaders portables

- Evitar macros complejas al inicio del MVP.
- Declarar todos los parámetros editables como `uniform`.
- No quemar valores importantes en constantes si el usuario debe iterar visualmente.
- Usar nombres claros: `u_glow`, `u_speed`, `u_noise_scale`, `u_color_a`.
- Mantener `precision highp float;` para WebGL1.
- Evitar funciones no soportadas por GLSL ES 1.00 si se usa WebGL1.

## Ejemplo recomendado

```glsl
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

uniform float u_glow;
uniform float u_speed;
uniform vec3 u_color_a;
uniform vec3 u_color_b;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    float d = length(uv);
    float wave = sin(d * 20.0 - u_time * u_speed);

    vec3 color = mix(u_color_a, u_color_b, wave * 0.5 + 0.5);
    color *= smoothstep(0.85, 0.1, d);
    color += u_glow * 0.15;

    gl_FragColor = vec4(color, 1.0);
}
```
