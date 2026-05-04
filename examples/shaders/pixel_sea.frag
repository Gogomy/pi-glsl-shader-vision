precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_speed;
uniform float u_pixel_size;
uniform float u_scale;
uniform float u_res_scale;
uniform float u_ratio;
uniform vec3 u_water_deep;
uniform vec3 u_water_shallow;

void main() {
    // Resolution scaling (lower = more retro)
    vec2 res = u_resolution * u_res_scale;

    // Pixelate UVs
    float ps = u_pixel_size;
    vec2 uv = floor(gl_FragCoord.xy / ps) * ps / res.xy;

    // Apply aspect ratio correction (1:1, 16:9, etc.)
    uv.x *= u_ratio;

    // Scale UVs for wave density
    uv *= u_scale;

    // Waves
    float wave1 = sin(uv.x * 8.0 + u_time * u_speed) * 0.5 + 0.5;
    float wave2 = sin(uv.x * 5.3 - u_time * u_speed * 0.7 + 1.5) * 0.3;
    float wave3 = sin(uv.y * 6.0 + u_time * u_speed * 0.5) * 0.15;
    float h = wave1 + wave2 + wave3;

    // Color: deeper = darker, higher waves = lighter
    vec3 col = mix(u_water_deep, u_water_shallow, h);

    // Foam on top of waves
    float foam = smoothstep(0.75, 0.85, h);
    col = mix(col, vec3(1.0), foam * 0.4);

    gl_FragColor = vec4(col, 1.0);
}
