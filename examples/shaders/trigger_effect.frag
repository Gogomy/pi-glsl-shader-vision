precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

// ── Triggers (buttons) ────────────────────────────────────
uniform float u_trigger_a;
uniform float u_trigger_b;

// ── Shared ────────────────────────────────────────────────
uniform float u_duration;

// ── Pulse A: particle explosion ───────────────────────────
uniform vec3 u_color_a;
uniform float u_a_speed;
uniform float u_a_size;
uniform float u_a_flash;
uniform float u_a_decay;

// ── Pulse B: shockwave ring ───────────────────────────────
uniform vec3 u_color_b;
uniform float u_b_speed;
uniform float u_b_width;
uniform float u_b_trail;
uniform float u_b_flash;

// ── Helpers ────────────────────────────────────────────────

float easeOut(float t) {
    return 1.0 - pow(1.0 - t, 3.0);
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// ─────────────────────────────────────────────────────────
// Pulse A — Particle explosion burst
// ─────────────────────────────────────────────────────────
vec3 pulseA(vec2 uv, float trigger) {
    if (trigger < 0.0) return vec3(0.0);

    float elapsed = u_time - trigger;
    float progress = clamp(elapsed / u_duration, 0.0, 1.0);
    float dist = length(uv);

    float eased = easeOut(progress);

    // Central flash on trigger
    float flash = exp(-progress * 12.0) * exp(-dist * 10.0) * u_a_flash;

    // Particles flying outward in random directions
    float particles = 0.0;
    float glow = 0.0;

    for (int i = 0; i < 20; i++) {
        float fi = float(i);

        // Deterministic random angle and speed per particle
        float pAngle = hash21(vec2(fi, 0.3)) * 6.2831853;
        float pSpeed = 0.5 + hash21(vec2(fi, 0.7)) * 1.0;
        float pSize = 0.01 + hash21(vec2(fi, 0.9)) * 0.05;

        // Current particle position (expands outward)
        float pRadius = eased * pSpeed * u_a_speed * 1.8;
        vec2 pPos = vec2(cos(pAngle), sin(pAngle)) * pRadius;

        // Distance from current pixel to this particle
        float d = length(uv - pPos);

        // Brightness fades as particle travels outward
        float brightness = exp(-progress * u_a_decay);

        // Sharp bright core
        float coreSize = pSize * u_a_size;
        particles += exp(-d * d / (coreSize * coreSize)) * brightness;

        // Soft glow around each particle
        glow += exp(-d / (coreSize * 5.0)) * brightness * 0.2;
    }

    // Alpha curve: quick fade-in, smooth fade-out
    float alpha = smoothstep(0.0, 0.06, progress);
    alpha *= 1.0 - smoothstep(0.4, 1.0, progress);

    vec3 col = u_color_a * (particles + glow + flash) * alpha;

    // Hot white-yellow tint in particle cores
    col += vec3(1.0, 0.9, 0.5) * particles * 0.35 * alpha;

    return col;
}

// ─────────────────────────────────────────────────────────
// Pulse B — Expanding shockwave ring
// ─────────────────────────────────────────────────────────
vec3 pulseB(vec2 uv, float trigger) {
    if (trigger < 0.0) return vec3(0.0);

    float elapsed = u_time - trigger;
    float progress = clamp(elapsed / u_duration, 0.0, 1.0);
    float dist = length(uv);

    float eased = easeOut(progress);

    // Main ring: sharp, fast, crisp
    float ringRadius = eased * u_b_speed * 1.6;
    float ringWidth = 0.025 * u_b_width * (1.0 - progress * 0.6);
    float ring = exp(-abs(dist - ringRadius) / ringWidth);

    // Secondary ring: behind, thicker, dimmer
    float ring2Radius = ringRadius * 0.55;
    float ring2Width = ringWidth * 2.5;
    float ring2 = exp(-abs(dist - ring2Radius) / ring2Width) * 0.3;

    // Afterglow trail inside the ring
    float trail = 0.0;
    if (dist < ringRadius) {
        trail = (1.0 - dist / ringRadius) * exp(-progress * 2.5) * (0.18 * u_b_trail);
    }

    // Central flash on trigger
    float flash = exp(-progress * 10.0) * exp(-dist * 8.0) * u_b_flash;

    // Alpha curve: quick fade-in, smooth fade-out
    float alpha = smoothstep(0.0, 0.06, progress);
    alpha *= 1.0 - smoothstep(0.4, 1.0, progress);

    vec3 col = u_color_b * (ring * 1.2 + trail + ring2 + flash) * alpha;

    // White-blue tint at ring peak
    col += vec3(0.6, 0.8, 1.0) * ring * 0.25 * alpha;

    return col;
}

void main() {
    // Centered UV, normalized by shortest side
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

    // Dark background with subtle vignette
    float vignette = 1.0 - length(uv) * 0.3;
    vec3 bg = vec3(0.015, 0.015, 0.04) * vignette;

    // Composite both pulses (can overlap)
    vec3 col = bg;
    col += pulseA(uv, u_trigger_a);
    col += pulseB(uv, u_trigger_b);

    // Prevent color overflow when pulses overlap
    col = min(col, vec3(1.8));

    gl_FragColor = vec4(col, 1.0);
}
