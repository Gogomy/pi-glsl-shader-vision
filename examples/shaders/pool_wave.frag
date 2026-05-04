precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

uniform float u_speed;
uniform float u_scale;
uniform float u_line_width;
uniform float u_wave_strength;
uniform float u_noise_scale;
uniform float u_noise_strength;
uniform float u_pixel_size;
uniform float u_under_width;
uniform float u_depth_width;
uniform float u_depth_offset;
uniform float u_depth_angle;
uniform vec3 u_water_color;
uniform vec3 u_shadow_color;
uniform vec3 u_depth_color;
uniform vec3 u_under_color;
uniform vec3 u_line_color;

vec2 hash22(vec2 p) {
    p = vec2(
        dot(p, vec2(127.1, 311.7)),
        dot(p, vec2(269.5, 183.3))
    );
    return fract(sin(p) * 43758.5453123);
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));

    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec2 flowNoise(vec2 p) {
    float n1 = noise(p + vec2(0.0, u_time * u_speed * 0.25));
    float n2 = noise(p + vec2(4.7, -u_time * u_speed * 0.22));
    return vec2(n1, n2) * 2.0 - 1.0;
}

float voronoiEdge(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);

    float d1 = 8.0;
    float d2 = 8.0;

    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);

            // animate points so the cells breathe like waves
            o = 0.5 + 0.32 * sin(u_time * u_speed + 6.2831 * o);

            vec2 r = g + o - f;
            float d = dot(r, r);

            if (d < d1) {
                d2 = d1;
                d1 = d;
            } else if (d < d2) {
                d2 = d;
            }
        }
    }

    return sqrt(d2) - sqrt(d1);
}

void main() {
    vec2 pixelCoord = floor(gl_FragCoord.xy / u_pixel_size) * u_pixel_size;
    vec2 uv = pixelCoord / u_resolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= u_resolution.x / u_resolution.y;

    // broad water wobble
    vec2 warp = vec2(
        sin(p.y * 3.5 + u_time * u_speed * 0.9),
        cos(p.x * 3.0 - u_time * u_speed * 0.7)
    ) * (0.06 * u_wave_strength);

    vec2 cellUv = (p + warp) * u_scale;

    // organic breakup so the lines feel less geometric
    vec2 organicWarp = flowNoise(cellUv * u_noise_scale) * (0.35 * u_noise_strength);
    cellUv += organicWarp;

    float edge = voronoiEdge(cellUv);
    edge += (noise(cellUv * (u_noise_scale * 1.8) + u_time * 0.15) - 0.5) * 0.06 * u_noise_strength;

    // deeper line layer: offset and drifting in another direction
    vec2 depthDir = vec2(cos(u_depth_angle), sin(u_depth_angle));
    vec2 depthUv = cellUv + depthDir * (u_depth_offset + u_time * u_speed * 0.12);
    float depthEdge = voronoiEdge(depthUv);
    depthEdge += (noise(depthUv * (u_noise_scale * 1.5) - u_time * 0.12) - 0.5) * 0.05 * u_noise_strength;

    float depthLines = 1.0 - smoothstep(0.0, u_line_width + u_under_width + u_depth_width, depthEdge);
    float underLines = 1.0 - smoothstep(0.0, u_line_width + u_under_width, edge);
    float lines = 1.0 - smoothstep(0.0, u_line_width, edge);

    // soft inner shading for water depth variation
    float shade = 0.5 + 0.5 * sin(cellUv.x * 1.6 + cellUv.y * 1.1 + u_time * u_speed * 0.6);
    vec3 water = mix(u_shadow_color, u_water_color, shade);

    // subtle vertical brightness like top-down pool water
    water += uv.y * 0.08;

    vec3 color = mix(water, u_depth_color, depthLines);
    color = mix(color, u_under_color, underLines);
    color = mix(color, u_line_color, lines);

    gl_FragColor = vec4(color, 1.0);
}
