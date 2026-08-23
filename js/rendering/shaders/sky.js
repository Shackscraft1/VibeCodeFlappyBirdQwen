// Procedural background shader: sky gradient, sun, parallax clouds, rolling
// hills, and a scrolling striped ground. All world motion is driven by
// u_scroll, which JS wraps to PERIOD — the pattern is exactly PERIOD-periodic
// (pure sinusoids), so it is seamless and exact in mediump precision.
export const SKY_FRAG = /* glsl */ `
precision mediump float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_scroll;

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

void main() {
  vec2 gp = gl_FragCoord.xy * (vec2(480.0) / u_resolution.x);
  float t = gl_FragCoord.y / u_resolution.y;

  // 1) Sky gradient
  vec3 top = vec3(0.30, 0.60, 0.93);
  vec3 horizon = vec3(0.82, 0.93, 0.98);
  vec3 col = mix(horizon, top, pow(t, 0.75));

  // 2) Sun with halo
  float sd = length(gp - vec2(386.0, 560.0));
  float halo = (1.0 - smoothstep(28.0, 110.0, sd)) * 0.30;
  float core = 1.0 - smoothstep(20.0, 28.0, sd);
  col = mix(col, vec3(1.0, 0.96, 0.78), halo);
  col = mix(col, vec3(1.0, 0.99, 0.93), core);

  // 3) Clouds — two parallax layers drifting with the world
  float cFar = cloudField(gp.x + u_scroll * 0.12, gp.y, 0.008);
  float cNear = cloudField(gp.x + u_scroll * 0.30 + 4000.0, gp.y - 40.0, 0.016);
  col = mix(col, vec3(1.0), cFar * 0.50);
  col = mix(col, vec3(1.0), cNear * 0.72);

  // 4) Hills — far then near
  float rf = ridgeFar(gp.x + u_scroll * 0.25);
  col = mix(col, vec3(0.56, 0.79, 0.58), 1.0 - smoothstep(rf - 3.0, rf + 3.0, gp.y));
  float rn = ridgeNear(gp.x + u_scroll * 0.55);
  col = mix(col, vec3(0.38, 0.66, 0.42), 1.0 - smoothstep(rn - 3.0, rn + 3.0, gp.y));

  // 5) Ground: dirt with a scrolling grass band on top
  float inGround = 1.0 - smoothstep(GROUND_TOP - 2.0, GROUND_TOP, gp.y);
  if (inGround > 0.0) {
    float gx = gp.x + u_scroll;
    float gstripe = step(0.5, fract(gx / 26.0));
    float dstripe = step(0.5, fract((gx + 13.0) / 34.0));
    vec3 dirt = mix(vec3(0.80, 0.64, 0.44), vec3(0.72, 0.56, 0.38), dstripe);
    vec3 grass = mix(vec3(0.45, 0.78, 0.35), vec3(0.36, 0.69, 0.27), gstripe);
    float grassMask = smoothstep(69.0, 71.0, gp.y);
    vec3 groundCol = mix(dirt, grass, grassMask);
    // Soft shadow line under the grass
    float band = smoothstep(66.0, 68.0, gp.y) - smoothstep(68.0, 70.0, gp.y);
    groundCol *= 1.0 - 0.20 * band;
    col = mix(col, groundCol, inGround);
  }

  gl_FragColor = vec4(col, 1.0);
}
`;
