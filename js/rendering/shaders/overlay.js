// Second shader pass, composited over the 2D game canvas: a soft vignette,
// a hint of animated film grain, and a full-screen flash (score pop / death).
export const OVERLAY_FRAG = /* glsl */ `
precision mediump float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_flash;
uniform vec3  u_flashColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 41.3);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // Vignette
  vec2 c = uv - 0.5;
  c.x *= u_resolution.x / u_resolution.y;
  float vig = 1.0 - smoothstep(0.35, 0.75, length(c));
  float vigAmount = (1.0 - vig) * 0.30;

  // Very subtle animated grain so the frame feels alive
  float grain = (hash21(gl_FragCoord.xy + vec2(u_time * 61.7, u_time * 83.3)) - 0.5) * 0.05;

  float alpha = clamp(vigAmount + u_flash * 0.85, 0.0, 1.0);
  vec3 color = mix(vec3(0.05, 0.06, 0.10), u_flashColor, u_flash);
  gl_FragColor = vec4(color, alpha + grain);
}
`;
