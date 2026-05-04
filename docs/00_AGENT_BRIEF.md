# Agent Brief — GLSL Shader Vision

## Objetivo

Construir una herramienta local para Pi Agent que permita visualizar shaders GLSL `.frag` en tiempo real, con animación, hot reload y edición de parámetros mediante UI. El visor debe servir para supervisión visual y pruebas iterativas. No debe intentar traducir shaders a otros lenguajes.

## Scope permitido

- Abrir shaders `.frag`.
- Renderizar fragment shaders con WebGL en un canvas.
- Animar con `requestAnimationFrame`.
- Inyectar uniforms base: resolución, tiempo, delta, frame, mouse.
- Crear UI de parámetros a partir de un archivo `.params.json`.
- Permitir sliders, checkboxes, color pickers, dropdowns y vectores.
- Guardar/cargar presets en `.presets.json`.
- Mostrar errores de compilación y linkeo GLSL.
- Generar capturas PNG.
- Generar contact sheets/probe sheets en varios tiempos.
- Exportar video corto opcional para revisión humana.
- Exponer comandos y tools en Pi Extension.
- Crear una Skill de Pi que indique cuándo usar el visor.

## Fuera de scope

- Porting automático a Godot, WGSL, HLSL, Unity o Unreal.
- Shader graph editor.
- Multipass avanzado estilo Shadertoy Buffer A/B/C/D en el MVP.
- Audio shaders.
- Compute shaders.
- WebGPU/WGSL como base inicial.
- Editor de código completo. El shader se edita en el editor normal del usuario.

## Regla crítica para el agente

Después de modificar un shader `.frag`, el agente debe validar visualmente mediante GLSL Shader Vision. Si no puede ejecutar el visor, debe decirlo explícitamente y no afirmar que el shader fue verificado.

## Entregables esperados

- Extensión local de Pi: `.pi/extensions/glsl-shader-vision/`.
- Skill local de Pi: `.pi/skills/glsl-shader-vision/SKILL.md`.
- Viewer web local: WebGL + Tweakpane + hot reload.
- CLI interna para probe/export.
- Documentación de uso.
- Ejemplo mínimo: `examples/magic_orb.frag`, `magic_orb.params.json`, `magic_orb.presets.json`.
