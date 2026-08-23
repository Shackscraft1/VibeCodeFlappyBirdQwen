// Vertex shader for a full-screen quad. Every effect in this game is a
// per-pixel fragment shader rendered onto this single quad.
export const FULLSCREEN_VERT = /* glsl */ `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;
