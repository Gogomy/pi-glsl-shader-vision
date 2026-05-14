---
name: glsl-shader-vision
description: >-
  Use when creating, editing, previewing, debugging, animating, testing, or visually validating GLSL/WebGL/Shadertoy fragment shaders. Provides workflow instructions for using the Pi GLSL Shader Vision extension with live animated preview, UI sliders for uniforms, presets, compile-error diagnosis, screenshots, probe sheets, and short video exports. This skill does not perform shader-language translation; translation should be handled separately after visual validation.
---

# GLSL Shader Vision

## Purpose

Use this skill when working with GLSL `.frag` shaders that need visual validation. The companion Pi extension opens an animated WebGL viewer with live uniform controls and can generate probe sheets or previews.

## Scope

Allowed:

- Preview GLSL fragment shaders.
- Validate compile/link status.
- Use live animated preview.
- Adjust uniforms with sliders, color pickers, and trigger buttons.
- Save/load presets.
- Generate screenshots, probe sheets, or short videos.

Not allowed inside this skill/tool:

- Automatic translation to Godot, WGSL, HLSL, Unity, Unreal, or other shader languages.
- Claiming visual correctness without preview/probe evidence.
- Creating shaders with hardcoded magic numbers instead of exposed uniforms.

## Workflow

### Step 0 — Before writing any shader

Decide what the user can control. **Every visually meaningful value must be a uniform.**

- What parameters should be adjustable? (speed, color, intensity, scale, duration, size, decay, flash, etc.)
- Does every adjustable parameter have a corresponding `uniform` in the shader?
- Will there be a `name.params.json` with an entry for each custom uniform?
- Does the shader start with `precision highp float;`?
- If using triggers: does the shader check `if (trigger < 0.0)` to skip before first press? Is the first frame visible (alpha > 0 at progress=0)?

**Golden rule: no magic numbers.** If a value affects the visual output (speed, radius, color, alpha, threshold, count, etc.), expose it. A shader that the user cannot tweak is useless for testing. Study `examples/shaders/trigger_effect.frag` for a model of full parameter exposure.

#### Trigger shader checklist

When creating a shader with button triggers:

1. Check for "not yet triggered": `if (u_trigger < 0.0) return vec3(0.0);`
2. Calculate elapsed: `float elapsed = u_time - u_trigger;`
3. Clamp progress: `float progress = clamp(elapsed / u_duration, 0.0, 1.0);`
4. Make progress=0 visible: prefer `exp(-progress * N)` or `1.0 - progress` for fade, avoid `smoothstep(0, X, 0)` which hides the first frame
5. Expose duration, color, and all visual parameters as uniforms with sliders

### Step 1 — Write and open

After editing a `.frag` shader:

1. Run the GLSL Shader Vision extension (`/glsl-open <shader.frag>`).
2. Check compile status.
3. If compile fails, fix the shader using the exact GLSL error.

### Step 2 — Verify interactivity (post-compile)

After the shader compiles successfully:

1. Confirm `name.params.json` exists alongside the shader.
2. Verify every custom `uniform` in the shader has a matching entry in the params file.
3. If the shader is creative/visual and has zero custom uniforms, ask: *should the user be able to tweak anything?* If yes, add uniforms and a params file.

### Step 3 — Visual evidence and report

1. If compile succeeds, generate visual evidence when useful (probe sheet, screenshot, video).
2. Report shader path, active preset, compile status, and output artifact paths.

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
precision highp float;

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

## Supported uniform types

| Type | UI control | GLSL type | .params.json example |
|---|---|---|---|
| `float` | Slider | `float` | `{"type":"float","default":1.0,"min":0,"max":5,"step":0.1}` |
| `int` | Slider (integer) | `int` | `{"type":"int","default":3,"min":1,"max":10,"step":1}` |
| `bool` | Checkbox | `bool` | `{"type":"bool","default":true}` |
| `color` | Color picker (RGB) | `vec3` | `{"type":"color","default":[1,0,0]}` |
| `color_alpha` | Color picker (RGBA) | `vec4` | `{"type":"color_alpha","default":[1,0,0,1]}` |
| `vec2` | Two sliders (X/Y) | `vec2` | `{"type":"vec2","default":[0,0],"min":[-1,-1],"max":[1,1]}` |
| `enum` | Dropdown | `int` | `{"type":"enum","default":0,"options":{"OptA":0,"OptB":1}}` |
| `button` | Trigger button | `float` | `{"type":"button","label":"▶ Fire"}` |

### Button type

A `button` uniform renders a clickable button in the UI. When pressed, it sets the uniform to the current **shader time** (same as `u_time`), allowing the shader to calculate elapsed time since the trigger:

```glsl
uniform float u_trigger;  // set to shader time on button press
// ...
float elapsed = u_time - u_trigger;
float progress = clamp(elapsed / u_duration, 0.0, 1.0);
```

- Default value is `-1.0` (not triggered). The shader **must** check `if (u_trigger < 0.0)` to skip rendering before the first press.
- At `progress = 0` (instant of press), the shader **must** produce visible output — avoid `smoothstep(0, X, 0)` which yields `0` and hides the first frame.
- If the viewer is paused when the button is pressed, it **auto-unpauses** so the animation plays immediately.
- Buttons are **not** persisted in presets (they are triggers, not state).
- Multiple buttons can coexist in the same shader for independent effects.
- **Performance note:** buttons use shader time, not wall-clock time. This ensures correct behavior across pause/resume and tab visibility changes.

See `examples/shaders/trigger_effect.frag` for a full example with two independent triggers.

## Complete examples

### Minimal (2 uniforms)

`example.frag`:
```glsl
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;
uniform vec3 u_color;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float wave = sin(uv.x * 10.0 + u_time * u_speed) * 0.5 + 0.5;
    vec3 col = mix(vec3(0.0), u_color, wave);
    gl_FragColor = vec4(col, 1.0);
}
```

`example.params.json`:
```json
{
  "version": 1,
  "uniforms": {
    "u_speed": {
      "type": "float",
      "label": "Speed",
      "default": 2.0,
      "min": 0.0,
      "max": 5.0,
      "step": 0.1,
      "group": "Animation"
    },
    "u_color": {
      "type": "color",
      "label": "Color",
      "default": [0.2, 0.6, 1.0],
      "group": "Color"
    }
  }
}
```

Key points:
- `precision highp float;` is **mandatory** — WebGL fragment shaders will not compile without it.
- Every custom `uniform` beyond the base set must have an entry in `name.params.json`.
- The `group` field organizes controls into labeled sections in the UI.

### Full parameter exposure (14 uniforms, 2 triggers)

`trigger_effect.frag` — demonstrates two independent button triggers (`u_trigger_a`, `u_trigger_b`), each with its own full parameter group. Every visual value (speed, size, decay, flash intensity, ring width, trail) is exposed as a uniform with a slider. Study this as the model for how to structure shaders that are fully controllable.

- `examples/shaders/trigger_effect.frag`
- `examples/shaders/trigger_effect.params.json`
- `examples/shaders/trigger_effect.presets.json`

### Complex reference (16 uniforms)

For a more complex reference with 16 uniforms, noise functions, color pickers, and multi-layer rendering, study the bundled example: `examples/shaders/pool_wave.frag` + `pool_wave.params.json`.

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
