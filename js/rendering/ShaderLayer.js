import { FULLSCREEN_VERT } from './shaders/common.js';
import { SKY_FRAG } from './shaders/sky.js';
import { OVERLAY_FRAG } from './shaders/overlay.js';

/**
 * WebGL layer rendered under the 2D game canvas. Two fragment shader
 * passes per frame:
 *   1. sky     — procedural background (shaders/sky.js)
 *   2. overlay — vignette / grain / flash (shaders/overlay.js)
 * Degrades gracefully: when WebGL is unavailable the caller swaps in a CSS
 * gradient (class "css-fallback").
 */
export class ShaderLayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = null;
    this.sky = null;
    this.overlay = null;
    this.quad = null;
    try {
      const gl =
        canvas.getContext('webgl', { antialias: false, alpha: true, depth: false, stencil: false }) ||
        canvas.getContext('experimental-webgl');
      if (!gl) throw new Error('WebGL is not available');
      this.gl = gl;
      this.sky = this.buildProgram(gl, FULLSCREEN_VERT, SKY_FRAG);
      this.overlay = this.buildProgram(gl, FULLSCREEN_VERT, OVERLAY_FRAG);
      this.quad = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    } catch (err) {
      console.warn('[ShaderLayer] WebGL unavailable, using CSS fallback background.', err);
      this.gl = null;
    }
  }

  get active() {
    return Boolean(this.gl);
  }

  setViewport(dpr, width, height) {
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
  }

  buildProgram(gl, vertexSrc, fragmentSrc) {
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
      }
      return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSrc));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSrc));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(program));
    }
    program.uniforms = {};
    program.attrib = gl.getAttribLocation(program, 'a_position');
    return program;
  }

  uniform(program, gl, name) {
    if (!(name in program.uniforms)) {
      program.uniforms[name] = gl.getUniformLocation(program, name);
    }
    return program.uniforms[name];
  }

  drawQuad(gl, program) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(program.attrib);
    gl.vertexAttribPointer(program.attrib, 2, gl.FLOAT, false, 0, 0);
  }

  render({ time, scroll, flash }) {
    const gl = this.gl;
    if (!gl) return;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Pass 1 — procedural sky
    gl.useProgram(this.sky);
    this.drawQuad(gl, this.sky);
    gl.uniform2f(this.uniform(this.sky, gl, 'u_resolution'), this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniform(this.sky, gl, 'u_time'), time);
    gl.uniform1f(this.uniform(this.sky, gl, 'u_scroll'), scroll);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Pass 2 — vignette / grain / flash
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.overlay);
    this.drawQuad(gl, this.overlay);
    gl.uniform2f(this.uniform(this.overlay, gl, 'u_resolution'), this.canvas.width, this.canvas.height);
    gl.uniform1f(this.uniform(this.overlay, gl, 'u_time'), time);
    gl.uniform1f(this.uniform(this.overlay, gl, 'u_flash'), flash.amount);
    gl.uniform3f(
      this.uniform(this.overlay, gl, 'u_flashColor'),
      flash.color[0],
      flash.color[1],
      flash.color[2],
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
  }
}
