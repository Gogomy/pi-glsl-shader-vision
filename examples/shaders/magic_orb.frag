precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_glow;
uniform float u_speed;
uniform vec3 u_color_a;
uniform vec3 u_color_b;

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    float d = length(uv);
    float wave = sin(d * 20.0 - u_time * u_speed);

    vec3 color = mix(u_color_a, u_color_b, wave * 0.5 + 0.5);
    color *= smoothstep(0.85, 0.1, d);
    color += u_glow * 0.15;

    gl_FragColor = vec4(color, 1.0);
}
