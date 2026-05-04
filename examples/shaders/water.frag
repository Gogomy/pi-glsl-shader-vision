precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_speed;
uniform float u_scale;
uniform float u_distortion;
uniform vec3 u_color_deep;
uniform vec3 u_color_shallow;
uniform vec3 u_color_caustic;

// Simple 2D noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.1;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 st = (uv - 0.5) * u_scale;
    st.x *= u_resolution.x / u_resolution.y;

    // Distortion from mouse position
    vec2 mouse = u_mouse / u_resolution - 0.5;
    float dist = length(st - mouse);
    float ripple = sin(dist * 12.0 - u_time * 2.0) * u_distortion * exp(-dist * 2.0);

    // Multiple wave layers
    float t = u_time * u_speed;
    float w1 = fbm(st * 3.0 + vec2(t * 0.4, t * 0.3)) - 0.5;
    float w2 = fbm(st * 6.0 - vec2(t * 0.2, t * 0.5)) - 0.5;
    float w3 = noise(st * 10.0 + t * 0.6) - 0.5;
    float waves = w1 * 0.6 + w2 * 0.3 + w3 * 0.2 + ripple;

    // Caustic light patterns (bright spots where waves converge)
    float caustic = fbm(st * 8.0 + waves * 4.0 + t * 0.3);
    caustic = smoothstep(0.4, 0.7, caustic);

    // Color gradient: deep at bottom, shallow with caustics
    float depth = uv.y + waves * 0.3;
    depth = clamp(depth, 0.0, 1.0);
    vec3 col = mix(u_color_deep, u_color_shallow, depth);

    // Add caustic highlights
    col = mix(col, u_color_caustic, caustic * 0.35 * (1.0 - depth * 0.5));

    // Edge foam
    float foam = smoothstep(0.9, 1.05, depth + waves * 0.5);
    col = mix(col, vec3(0.9, 0.95, 1.0), foam * 0.6);

    // Subtle vignette
    float vig = 1.0 - length(st) * 0.4;
    col *= vig;

    gl_FragColor = vec4(col, 1.0);
}
