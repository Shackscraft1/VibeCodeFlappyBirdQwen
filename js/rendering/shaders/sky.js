// Procedural background shader: sky gradient, sun/moon, stars, parallax
// clouds, rolling hills, and a scrolling striped ground. All world motion is
// driven by u_scroll, which JS wraps to PERIOD — the pattern is exactly
// PERIOD-periodic (pure sinusoids), so it is seamless and exact in mediump
// precision. u_night (0..1, eased on the JS side) crossfades the whole scene
// between day and night.
export const SKY_FRAG = /* glsl */ `
precision mediump float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_scroll;
uniform float u_night;

const float TAU = 6.28318530718;
const float PERIOD = 8192.0;
const float GROUND_TOP = 80.0;

// Rolling hill silhouettes (periodic: no seams, no precision drift).
float ridgeFar(float x) {
  float a = TAU * x / PERIOD;
  return 96.0
    + 20.0 * sin(a * 5.0 + 0.3)
    + 12.0 * sin(a * 11.0 + 1.7)
    + 6.0 * sin(a * 19.0 + 4.2);
}

float ridgeNear(float x) {
  float a = TAU * x / PERIOD;
  return 88.0
    + 16.0 * sin(a * 9.0 + 0.8)
    + 9.0 * sin(a * 17.0 + 2.9)
    + 4.0 * sin(a * 29.0 + 0.4);
}

// Puffy stylized clouds.
float cloudField(float x, float y, float s) {
  float n = 0.5
    + 0.24 * sin(x * s * 3.0 + sin(y * s * 2.0) * 1.5)
    + 0.18 * sin(x * s * 7.0 - y * s * 5.0)
    + 0.08 * sin(x * s * 13.0 + y * s * 11.0 + 2.0);
  float puffs = smoothstep(0.42, 0.64, n);
  float fade = smoothstep(140.0, 240.0, y) * (1.0 - smoothstep(480.0, 560.0, y));
  return puffs * fade;
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 gp = gl_FragCoord.xy * (vec2(480.0) / u_resolution.x);
  float t = gl_FragCoord.y / u_resolution.y;
  float n = clamp(u_night, 0.0, 1.0);

  // 1) Sky gradient, day -> night
  vec3 top = mix(vec3(0.30, 0.60, 0.93), vec3(0.03, 0.05, 0.18), n);
  vec3 horizon = mix(vec3(0.82, 0.93, 0.98), vec3(0.15, 0.19, 0.38), n);
  vec3 col = mix(horizon, top, pow(t, 0.75));

  // 2) Stars — only at night, above the hills, gently twinkling
  if (n > 0.01 && gp.y > 96.0) {
    vec2 cell = floor(gp / 26.0);
    float h = hash21(cell);
    vec2 off = vec2(hash21(cell + 19.7), hash21(cell + 41.3)) - 0.5;
    float d = length(fract(gp / 26.0) - 0.5 - off * 0.6);
    float star = smoothstep(0.35, 0.05, d) * step(0.78, h);
    star *= 0.65 + 0.35 * sin(u_time * 2.5 + h * 40.0);
    col = mix(col, vec3(1.0, 1.0, 0.95), star * n * 0.9);
  }

  // 3) Sun by day, moon by night (same spot, crossfaded)
  float sd = length(gp - vec2(386.0, 560.0));
  float halo = (1.0 - smoothstep(28.0, 110.0, sd)) * mix(0.30, 0.16, n);
  float core = 1.0 - smoothstep(20.0, 28.0, sd);
  col = mix(col, mix(vec3(1.0, 0.96, 0.78), vec3(0.90, 0.93, 1.0), n), halo);
  col = mix(col, mix(vec3(1.0, 0.99, 0.93), vec3(0.97, 0.98, 1.0), n), core);

  // 4) Clouds — two parallax layers drifting with the world, dimmed at night
  vec3 cloudCol = mix(vec3(1.0), vec3(0.55, 0.60, 0.78), n);
  float cFar = cloudField(gp.x + u_scroll * 0.12, gp.y, 0.008);
  float cNear = cloudField(gp.x + u_scroll * 0.30 + 4000.0, gp.y - 40.0, 0.016);
  col = mix(col, cloudCol, cFar * mix(0.50, 0.30, n));
  col = mix(col, cloudCol, cNear * mix(0.72, 0.40, n));

  // 5) Hills — far then near, shaded down at night
  float rf = ridgeFar(gp.x + u_scroll * 0.25);
  vec3 hillFarCol = mix(vec3(0.56, 0.79, 0.58), vec3(0.15, 0.21, 0.33), n);
  col = mix(col, hillFarCol, 1.0 - smoothstep(rf - 3.0, rf + 3.0, gp.y));
  float rn = ridgeNear(gp.x + u_scroll * 0.55);
  vec3 hillNearCol = mix(vec3(0.38, 0.66, 0.42), vec3(0.10, 0.15, 0.25), n);
  col = mix(col, hillNearCol, 1.0 - smoothstep(rn - 3.0, rn + 3.0, gp.y));

  // 6) Ground: dirt with a scrolling grass band on top, darker at night
  float inGround = 1.0 - smoothstep(GROUND_TOP - 2.0, GROUND_TOP, gp.y);
  if (inGround > 0.0) {
    float gx = gp.x + u_scroll;
    float gstripe = step(0.5, fract(gx / 26.0));
    float dstripe = step(0.5, fract((gx + 13.0) / 34.0));
    vec3 dirt = mix(vec3(0.80, 0.64, 0.44), vec3(0.72, 0.56, 0.38), dstripe);
    vec3 grass = mix(vec3(0.45, 0.78, 0.35), vec3(0.36, 0.69, 0.27), gstripe);
    float grassMask = smoothstep(69.0, 71.0, gp.y);
    vec3 groundCol = mix(dirt, grass, grassMask) * (1.0 - 0.55 * n);
    // Soft shadow line under the grass
    float band = smoothstep(66.0, 68.0, gp.y) - smoothstep(68.0, 70.0, gp.y);
    groundCol *= 1.0 - 0.20 * band;
    col = mix(col, groundCol, inGround);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
