# Product Spec — GLSL Shader Vision

## Problema

Al crear shaders para arte técnico, el agente puede editar código, pero no basta con revisar texto. Un shader necesita validación visual: movimiento, color, escala, parámetros, respuesta al tiempo y posibles artefactos.

## Solución

Un visor local animado que renderiza GLSL `.frag` en un canvas WebGL y genera una UI automática para uniforms. El usuario puede tocar sliders en tiempo real y guardar presets. El agente puede generar capturas y probe sheets para revisar estados visuales concretos.

## Usuario principal

- Artista técnico / environment artist.
- Trabaja con shaders para efectos visuales: orbes, magia, fuego, niebla, agua, brillos, distorsión, UI pixel art, etc.
- Quiere prototipar rápido en GLSL y después usar el agente para traducir a otro lenguaje si es necesario.

## Experiencia esperada

Comando humano:

```txt
/glsl-open shaders/magic_orb.frag
```

Resultado:

- Se abre un navegador local.
- El shader se ve animado.
- Al guardar el `.frag`, el preview se recarga.
- Si el shader falla, se muestra el error GLSL sobre el canvas.
- A la derecha hay sliders/controles generados desde `.params.json`.
- Se pueden guardar presets.
- Se pueden generar capturas/probe sheets.

## Casos de uso principales

### Caso 1 — Crear shader desde cero

1. El usuario pide un efecto visual.
2. El agente crea `effect.frag` y `effect.params.json`.
3. El agente abre el visor.
4. El usuario ajusta parámetros.
5. Se guarda un preset aprobado.

### Caso 2 — Debug de shader roto

1. El agente abre el shader.
2. El viewer reporta compile/link error.
3. El agente corrige el GLSL.
4. Reintenta hasta que compile.

### Caso 3 — Comparar variantes

1. El usuario guarda varios presets.
2. El agente genera `probe_sheet.png` para cada preset.
3. El usuario elige la variante final.

### Caso 4 — Preparar shader para traducción posterior

1. El shader GLSL queda visualmente aprobado.
2. Se conservan `.frag`, `.params.json`, `.presets.json` y probe sheet.
3. El agente usa esos archivos como fuente para generar otro shader en una tarea separada.

## Criterio de éxito del MVP

El MVP es aceptable cuando permite:

- Abrir un `.frag` local.
- Ver animación con `u_time`.
- Usar sliders desde `.params.json`.
- Hacer hot reload.
- Mostrar errores de compilación.
- Guardar presets.
- Generar una probe sheet.
