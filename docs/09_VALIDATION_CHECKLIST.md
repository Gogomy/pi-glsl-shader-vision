# Validation Checklist

## Validación funcional

- [ ] `/glsl-open shader.frag` abre navegador.
- [ ] El shader se renderiza en canvas.
- [ ] `u_time` anima correctamente.
- [ ] `u_resolution` coincide con el canvas.
- [ ] `u_mouse` cambia al mover el mouse.
- [ ] Un shader con error muestra compile error.
- [ ] Hot reload funciona al guardar `.frag`.
- [ ] Hot reload funciona al guardar `.params.json`.
- [ ] Sliders modifican uniforms sin recompilar.
- [ ] Color picker modifica `vec3` o `vec4`.
- [ ] Preset se guarda en `.presets.json`.
- [ ] Preset se puede cargar.
- [ ] Probe sheet se genera correctamente.
- [ ] `read_glsl_shader_state` devuelve estado real.

## Validación de shader local `u_*`

- [ ] `u_resolution` funciona.
- [ ] `u_time` funciona.
- [ ] `u_delta` funciona.
- [ ] `u_frame` funciona.
- [ ] `u_mouse` funciona.
- [ ] Custom float uniform funciona.
- [ ] Custom color uniform funciona.

## Validación Shadertoy

- [ ] Detecta `mainImage`.
- [ ] Inyecta `iResolution`.
- [ ] Inyecta `iTime`.
- [ ] Inyecta `iTimeDelta`.
- [ ] Inyecta `iFrame`.
- [ ] Inyecta `iMouse`.
- [ ] Envuelve `mainImage` sin duplicar `main()`.

## Validación de errores

- [ ] Archivo inexistente: error claro.
- [ ] JSON inválido: error claro.
- [ ] Uniform en params pero no en GLSL: warning.
- [ ] Tipo no soportado: warning.
- [ ] WebGL no disponible: error claro.
- [ ] Puerto ocupado: usa otro puerto o informa.

## Validación de agente

- [ ] El agente no afirma validación visual sin probe/preview.
- [ ] El agente no usa el visor para porting.
- [ ] El agente reporta rutas de outputs.
- [ ] El agente reporta preset activo.
- [ ] El agente incluye compile status.

## Validación Windows

- [ ] Paths con `D:\...` funcionan.
- [ ] Paths con espacios funcionan.
- [ ] Abrir navegador funciona desde PowerShell/CMD/Git Bash.
- [ ] No depende de herramientas Unix obligatorias.
- [ ] `npm install` funciona.

## Definition of Done MVP

El MVP se considera completo cuando:

```txt
Un usuario puede abrir un shader .frag, verlo animado, ajustar al menos 3 uniforms mediante UI, guardar un preset, generar una probe sheet y recibir errores GLSL claros cuando el shader falla.
```
