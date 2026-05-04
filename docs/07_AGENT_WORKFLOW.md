# Agent Workflow

## Cuándo usar GLSL Shader Vision

Usar cuando el usuario pida:

- Crear un shader GLSL.
- Editar un `.frag`.
- Probar efecto visual animado.
- Ajustar parámetros en tiempo real.
- Ver un shader tipo Shadertoy.
- Generar preview/probe de shader.
- Validar que un shader compile.
- Preparar un shader visualmente antes de traducirlo manualmente a otro lenguaje.

## Flujo obligatorio después de editar `.frag`

```txt
1. Leer shader actual.
2. Modificar shader o params.
3. Ejecutar open/probe según la tarea.
4. Revisar compile status.
5. Si hay error, corregir y repetir.
6. Si compila, generar evidencia visual cuando corresponda.
7. Reportar rutas de outputs y preset usado.
```

## Reglas de no-asumir

- No decir “se ve bien” si no se generó preview/probe.
- No decir “compila” si no se leyó estado de compilación.
- No traducir a otro lenguaje dentro de la herramienta de preview.
- Si el usuario pide porting después, hacer una tarea separada leyendo los archivos validados.

## Qué debe crear el agente para un shader nuevo

Para `magic_orb`:

```txt
shaders/magic_orb.frag
shaders/magic_orb.params.json
shaders/magic_orb.presets.json
```

Luego abrir:

```txt
/glsl-open shaders/magic_orb.frag
```

## Cómo reportar al usuario

Formato recomendado:

```txt
Shader: shaders/magic_orb.frag
Preview: http://127.0.0.1:5177/?shader=...
Compile: OK
Preset activo: default
Probe generado: .pi/glsl-shader-vision/output/magic_orb_probe_default.png

Notas:
- u_glow controla intensidad del brillo.
- u_speed controla la velocidad del pulso.
- El shader usa contrato u_*.
```

Si falla:

```txt
Shader: shaders/magic_orb.frag
Compile: ERROR
Error:
ERROR: 0:42: 'noise2d' : no matching overloaded function found

Acción:
- Revisaré la función noise2d o sus argumentos.
```

## Flujo con presets

1. Usuario ajusta sliders.
2. Usuario o agente guarda preset.
3. El agente genera probe sheet usando ese preset.
4. Ese preset es el estado aprobado para futuros cambios.

## Flujo de traducción posterior

Cuando el usuario pida traducir el shader:

1. Leer `.frag` validado.
2. Leer `.params.json`.
3. Leer preset aprobado en `.presets.json`.
4. Generar archivo destino separado.
5. No modificar el visor salvo que sea necesario para validar de nuevo.

## Mensaje de advertencia para shaders Godot

Godot shaders no son GLSL puro. Si el usuario entrega `shader_type canvas_item;`, el visor no debe prometer compatibilidad directa. Debe pedir o generar una versión GLSL de preview, o tratarlo como tarea de traducción fuera del visor.
