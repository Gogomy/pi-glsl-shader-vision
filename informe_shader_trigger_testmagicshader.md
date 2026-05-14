# Informe: Integración de trigger en testmagicshader.frag

**Fecha:** 2026-05-14  
**Shader:** `testmagicshader.frag`  
**Extensión:** `@gogomi/pi-glsl-shader-vision`

---

## Objetivo

Agregar un trigger (`button`) al shader de sparkles para que la animación se inicie con un botón y luego termine (fade-out), en lugar de correr en loop continuo.

---

## Problemas encontrados

### 1. Error de tipos: `u_count` en `params.json`

**Síntoma:** pantalla negra, sin sparkles visibles.

**Causa:** `u_count` está declarado en el shader como `uniform float u_count`, pero en `params.json` se escribió como `"type": "int"`. La extensión usó `uniform1i` en lugar de `uniform1f`, el uniform quedó en 0, y el bucle `for` rompía inmediatamente sin renderizar nada.

**Corrección:** cambiar `"type": "int"` a `"type": "float"` en `params.json`.

**Regla:** al crear un `params.json`, el tipo de cada uniform debe copiarse de la declaración GLSL (`uniform float`, `uniform int`, `uniform vec3`, etc.), no inferirse de cómo se usa después en el código (ej. `int count = int(u_count)`).

### 2. Primer frame invisible con `smoothstep(0.0, X, 0.0)`

Al presionar el trigger, en `progress = 0`, la expresión `smoothstep(0.0, 0.18, 0.0)` devuelve `0.0`, ocultando el primer frame. La documentación de la extensión lo advierte explícitamente.

**Corrección:** usar `1.0 - smoothstep(0.5, 1.0, progress)` para fade-out, eliminando el fade-in. Los sparkles aparecen visibles al 100% instantáneamente al presionar el botón y se desvanecen en la segunda mitad de la duración.

### 3. `#ifdef GL_ES` no apto para WebGL

La nueva versión de la extensión requiere `precision highp float;` explícito. El bloque `#ifdef GL_ES` / `precision mediump float;` no garantiza una declaración de precisión en contexto WebGL.

**Corrección:** reemplazar por `precision highp float;` en la primera línea.

---

## Lecciones

| # | Lección |
|---|---------|
| 1 | El tipo en `params.json` debe coincidir exactamente con la declaración `uniform` del shader. No inferir por uso. |
| 2 | `smoothstep(0, X, 0)` siempre da 0. Para triggers, el primer frame debe ser visible. |
| 3 | `precision highp float;` es obligatorio en WebGL. No depender de `#ifdef GL_ES`. |
| 4 | Sin `params.json` ni preset, todos los uniforms arrancan en 0 (sin sparkles). |

---

## Estado final

El shader quedó restaurado a su versión original funcional, sin trigger. `params.json` provee defaults visibles (20 sparkles dorados).
