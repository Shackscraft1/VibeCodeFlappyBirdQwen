// Browser-API stand-ins + a tiny test framework, so the game core can be
// exercised headlessly with plain `node` (no dependencies).

// ---------- mini test framework ----------

let passed = 0;
let failed = 0;

export function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok    ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}\n        ${err.message}`);
  }
}

export function summary() {
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
  return failed;
}

export function assert(condition, message) {
  if (!condition) throw new Error(message ?? 'assertion failed');
}

export function assertClose(actual, expected, epsilon, message) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(message ?? `expected ~${expected}, got ${actual}`);
  }
}

// ---------- fakes ----------

export class FakeLocalStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

/**
 * Canvas whose 2D context records every method call, so render code can be
 * smoke-tested without a real rasterizer.
 */
export function make2DCanvas(width = 480, height = 640) {
  const target = {};
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return t[prop];
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      t.__calls ??= {};
      t.__calls[prop] = (t.__calls[prop] ?? 0) + 1;
      return () => {};
    },
    set(t, prop, value) {
      t[prop] = value;
      return true;
    },
  });
  const canvas = {
    width,
    height,
    style: {},
    getContext(kind) { return kind === '2d' ? ctx : null; },
  };
  ctx.canvas = canvas;
  return { canvas, ctx, calls: () => ctx.__calls ?? {} };
}

/** Minimal WebGL context stub that counts calls and accepts everything. */
export function makeGL() {
  const calls = {};
  const impl = {
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => '',
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    getProgramInfoLog: () => '',
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    useProgram: () => {},
    getUniformLocation: () => ({}),
    getAttribLocation: () => 0,
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    uniform1f: () => {},
    uniform2f: () => {},
    uniform3f: () => {},
    drawArrays: () => {},
    viewport: () => {},
    clearColor: () => {},
    clear: () => {},
    enable: () => {},
    disable: () => {},
    blendFunc: () => {},
  };
  const gl = new Proxy(impl, {
    get(t, prop) {
      if (prop in t) {
        const value = t[prop];
        if (typeof value === 'function') {
          return (...args) => {
            calls[prop] = (calls[prop] ?? 0) + 1;
            return value(...args);
          };
        }
        return value;
      }
      return () => { calls[prop] = (calls[prop] ?? 0) + 1; };
    },
  });
  return { gl, calls };
}

export function makeGLCanvas(gl) {
  return {
    width: 480,
    height: 640,
    style: {},
    classList: { add() {} },
    getContext() { return gl; },
  };
}

/** Web Audio stub that counts how many nodes/effects get scheduled. */
export function makeAudioContext() {
  const counts = { oscillator: 0, bufferSource: 0, buffer: 0, start: 0 };
  const param = (value = 440) => ({
    value,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const ctx = {
    sampleRate: 44100,
    currentTime: 0,
    state: 'running',
    destination: {},
    resume() { return Promise.resolve(); },
    createGain() {
      return {
        gain: param(1),
        connect() { return this; },
      };
    },
    createOscillator() {
      counts.oscillator += 1;
      return {
        type: 'sine',
        frequency: param(440),
        connect() { return this; },
        start() { counts.start += 1; },
        stop() {},
      };
    },
    createBuffer(channels, length) {
      counts.buffer += 1;
      return { getChannelData: () => new Float32Array(length) };
    },
    createBufferSource() {
      counts.bufferSource += 1;
      return {
        buffer: null,
        connect() { return this; },
        start() { counts.start += 1; },
        stop() {},
      };
    },
  };
  return { ctx, counts };
}
