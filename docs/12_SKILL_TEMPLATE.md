# Skill Template — `.pi/skills/glsl-shader-vision/SKILL.md`

Copiar este contenido a:

```txt
.pi/skills/glsl-shader-vision/SKILL.md
```

```md
---
name: glsl-shader-vision
description: Use when creating, editing, previewing, debugging, animating, testing, or visually validating GLSL/WebGL/Shadertoy fragment shaders. Provides workflow instructions for using the Pi GLSL Shader Vision extension with live animated preview, UI sliders for uniforms, presets, compile-error diagnosis, screenshots, probe sheets, and short video exports. This skill does not perform shader-language translation; translation should be handled separately after visual validation.
---

# GLSL Shader Vision

## Purpose

Use this skill when working with GLSL `.frag` shaders that need visual validation. The companion Pi extension opens an animated WebGL viewer with live uniform controls and can generate probe sheets or previews.

## Scope

Allowed:

- Preview GLSL fragment shaders.
- Validate compile/link status.
- Use live animated preview.
- Adjust uniforms with sliders and controls.
- Save/load presets.
- Generate screenshots, probe sheets, or short videos.

Not allowed inside this skill/tool:

- Automatic translation to Godot, WGSL, HLSL, Unity, Unreal, or other shader languages.
- Claiming visual correctness without preview/probe evidence.

## Workflow

After editing a `.frag` shader:

1. Run the GLSL Shader Vision extension.
2. Check compile status.
3. If compile fails, fix the shader using the exact GLSL error.
4. If compile succeeds, generate visual evidence when useful.
5. Report shader path, active preset, compile status, and output artifact paths.

## Commands

```txt
/glsl-open <shader.frag>
/glsl-probe <shader.frag> --times 0,0.5,1,2,4 --preset default
/glsl-export <shader.frag> --duration 4 --fps 30 --preset default
/glsl-state <shader.frag>
```

## File Contract

For `name.frag`, prefer:

```txt
name.frag
name.params.json
name.presets.json
```

Use `name.params.json` for UI controls and `name.presets.json` for approved visual variants.

## Base uniforms

Local mode:

```glsl
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_delta;
uniform int u_frame;
```

Shadertoy mode:

```glsl
uniform vec3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform int iFrame;
uniform vec4 iMouse;
```

## Reporting format

```txt
Shader: <path>
Compile: OK|ERROR
Mode: local|shadertoy
Preset: <name>
Preview: <url if opened>
Probe: <path if generated>
Notes: <short notes>
```
```
