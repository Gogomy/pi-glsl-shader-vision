# Reference Research

## Pi Extensions

Pi extensions son módulos TypeScript que pueden registrar tools llamables por el LLM, comandos, eventos y UI. Para este proyecto, la extensión es necesaria porque una skill no ejecuta preview por sí sola.

Referencia:

- https://pi.dev/docs/latest/extensions

Puntos relevantes:

- Project-local extensions: `.pi/extensions/`.
- Hot reload con `/reload` para extensiones auto-descubiertas.
- `pi.registerTool()` para tools del agente.
- `pi.registerCommand()` para comandos slash.

## Pi Skills

Pi skills son paquetes de instrucciones que el agente carga bajo demanda. La descripción determina cuándo el agente carga la skill; debe ser específica.

Referencia:

- https://pi.dev/docs/latest/skills

Puntos relevantes:

- Project-local skills: `.pi/skills/`.
- Skill en directorio con `SKILL.md`.
- Frontmatter con `name` y `description`.
- Nombre lowercase con hyphens.
- Descripción específica y no genérica.

## Shadertoy

Shadertoy usa el patrón `mainImage(out vec4 fragColor, in vec2 fragCoord)` y uniforms como `iResolution`, `iTime`, `iMouse`, `iFrame`, `iChannel0..3`.

Referencia:

- https://www.shadertoy.com/howto

Uso para este proyecto:

- Soportar `mainImage` como modo opcional.
- Copiar el contrato mínimo de uniforms.
- No implementar multipass avanzado en MVP.

## The Book of Shaders

The Book of Shaders usa convenciones simples como `u_resolution`, `u_mouse`, `u_time`, adecuadas para shaders locales y didácticos.

Referencia:

- https://thebookofshaders.com/03/

Uso para este proyecto:

- Adoptar `u_*` como contrato principal para shaders propios.
- Usar `gl_FragCoord` como base para coordenadas de fragmento.

## Tweakpane

Tweakpane es una librería compacta para ajustar parámetros, con sliders, colores, booleans, folders y presets.

Referencias:

- https://tweakpane.github.io/docs/
- https://tweakpane.github.io/docs/input-bindings/

Uso para este proyecto:

- Generar UI desde `.params.json`.
- Mapear números a sliders.
- Mapear colores a color picker.
- Mapear booleans a checkbox.
- Usar folders por grupo.

## glslCanvas

glslCanvas es referencia útil porque carga fragment shaders en canvas WebGL e inyecta uniforms como `u_time`, `u_resolution`, `u_mouse`.

Referencias:

- https://github.com/patriciogonzalezvivo/glslCanvas
- https://github.com/actarian/glsl-canvas

Uso para este proyecto:

- Inspirarse en su modelo de uniforms y reload.
- Evaluar como dependencia si conviene acelerar implementación.

## Fullscreen quad

Renderizar fragment shaders tipo Shadertoy normalmente se hace con un fullscreen quad: dos triángulos que cubren todo el canvas.

Referencia:

- https://ostefani.dev/tech-notes/webgl-drawing-full-screen-quad

Uso para este proyecto:

- No crear escena 3D.
- No crear cámara.
- Dibujar solo el quad y ejecutar el fragment shader por píxel.
