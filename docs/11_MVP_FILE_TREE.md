# MVP File Tree

Estructura recomendada para implementar el proyecto dentro de un repo existente:

```txt
.pi/
├─ extensions/
│  └─ glsl-shader-vision/
│     ├─ index.ts
│     ├─ package.json
│     ├─ preview-server.mjs
│     ├─ scripts/
│     │  ├─ render-probe.mjs
│     │  └─ export-video.mjs
│     └─ public/
│        ├─ index.html
│        ├─ viewer.js
│        └─ style.css
│
└─ skills/
   └─ glsl-shader-vision/
      └─ SKILL.md

docs/
├─ glsl-shader-vision-usage.md
└─ glsl-shader-vision-troubleshooting.md

examples/
└─ shaders/
   ├─ magic_orb.frag
   ├─ magic_orb.params.json
   └─ magic_orb.presets.json
```

## Archivos runtime generados

```txt
.pi/glsl-shader-vision/
├─ state/
│  └─ magic_orb.status.json
└─ output/
   ├─ magic_orb_probe_default.png
   ├─ magic_orb_probe_default.json
   └─ magic_orb_capture_001.png
```

## No versionar normalmente

```txt
.pi/glsl-shader-vision/output/
.pi/glsl-shader-vision/state/
node_modules/
```

## Versionar normalmente

```txt
.pi/extensions/glsl-shader-vision/
.pi/skills/glsl-shader-vision/SKILL.md
docs/
examples/shaders/
```
