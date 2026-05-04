# Extension Implementation Notes

## `index.ts` responsibilities

Pi v0.72.1 real API. Extension factory: `(pi: ExtensionAPI)`. Tool schemas use TypeBox. Commands require `description`.

Pseudo-estructura corregida:

```ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("glsl-open", {
    description: "Open animated GLSL shader preview",
    handler: async (args, ctx) => {
      // ctx.cwd para resolver paths
      // Lanzar/reutilizar preview server
      // Abrir navegador o imprimir URL
      // ctx.ui.notify para feedback
    },
  });

  pi.registerTool({
    name: "open_glsl_shader_preview",
    label: "Open GLSL Preview",
    description: "Open a live animated WebGL preview for a GLSL fragment shader.",
    parameters: Type.Object({
      shader_path: Type.String({ description: "Path to .frag shader file" }),
      width: Type.Optional(Type.Number()),
      height: Type.Optional(Type.Number()),
      mode: Type.Optional(Type.String()),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      // ctx.cwd para resolver paths
      // start preview, return URL/status path
      return {
        content: [{ type: "text", text: "..." }],
        details: { ok: true, url: "..." },
      };
    },
  });
}
```

**Nota:** La API real se documenta en `node_modules/@mariozechner/pi-coding-agent/docs/extensions.md`. Ver también ejemplos en `examples/extensions/`.

## Server responsibilities

Pseudo-endpoints:

```txt
GET  /                              viewer HTML
GET  /api/shader?path=<path>         shader source
GET  /api/params?path=<path>         params json
GET  /api/presets?path=<path>        presets json
POST /api/presets/save              save preset
GET  /api/state?path=<path>          compile/runtime state
WS   /ws                            file change notifications
```

## Viewer responsibilities

Pseudo-loop:

```js
let start = performance.now();
let last = start;
let frame = 0;

function loop(now) {
  const time = (now - start) / 1000;
  const delta = (now - last) / 1000;
  last = now;

  setBaseUniforms({time, delta, frame, resolution, mouse});
  setCustomUniforms(paramsState);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  frame++;
  requestAnimationFrame(loop);
}
```

## Shadertoy wrapper idea

```js
function buildShadertoySource(userSource) {
  return `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform vec4 iMouse;
${userSource}
void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
}`;
}
```

Need to avoid duplicate precision/uniform declarations when user source already includes them. MVP can be simple and documented.

## Probe generation strategy

Option A: Playwright opens viewer with query params:

```txt
http://127.0.0.1:5177/?shader=...&preset=default&time=1.0&paused=1
```

Then capture canvas screenshot.

Option B: create a standalone `render-probe.mjs` that embeds shader source into an HTML page and captures directly.

Recommended MVP: Option A, reuse viewer logic.
