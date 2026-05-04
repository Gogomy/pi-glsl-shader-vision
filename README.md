
# GLSL Shader Vision

Carpeta de planificación para construir un visor GLSL animado orientado a Pi Agent.

El contenido importante está en `docs/`. El proyecto define un visor WebGL local capaz de cargar shaders `.frag`, mostrarlos animados, exponer uniforms como sliders/controles UI, guardar presets y generar evidencia visual para que el agente y el usuario validen el shader antes de usarlo en otro lenguaje o motor.

No incluye porting automático. La traducción a Godot/WGSL/HLSL/etc. queda fuera del scope del visor y debe hacerla el agente como una tarea separada después de la validación visual.

Orden sugerido de lectura:

1. `docs/00_AGENT_BRIEF.md`
2. `docs/01_PRODUCT_SPEC.md`
3. `docs/02_ARCHITECTURE.md`
4. `docs/03_SHADER_CONTRACTS.md`
5. `docs/04_PARAMS_PRESETS_SCHEMA.md`
6. `docs/08_IMPLEMENTATION_PLAN.md`
7. `docs/09_VALIDATION_CHECKLIST.md`
