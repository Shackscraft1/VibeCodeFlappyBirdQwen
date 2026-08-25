import { GameState } from '../core/Game.js';
import { clamp } from '../utils/math.js';
import { roundRectPath } from '../utils/draw.js';

/**
 * Draws the bird and pipes onto a transparent 2D canvas layered above the
 * shader background. Pure presentation — no game state is mutated.
 */
export class Renderer2D {
  constructor(canvas, config) {
    this.canvas = canvas;
    this.config = config;
    this.ctx = canvas.getContext('2d');
  }

  setViewport(dpr) {
    const { WIDTH, HEIGHT } = this.config;
    this.canvas.width = Math.round(WIDTH * dpr);
    this.canvas.height = Math.round(HEIGHT * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  get groundTop() {
    return this.config.HEIGHT - this.config.GROUND_HEIGHT;
  }

  draw({ bird, pipes, state, time, night = 0 }) {
    const { WIDTH, HEIGHT } = this.config;
    this.ctx.clearRect(0, 0, WIDTH, HEIGHT);
    for (const pipe of pipes) this.drawPipe(pipe);
    this.drawBird(bird, state, time);

    // Night tint over the sprites (the shader handles the sky itself).
    if (night > 0.01) {
      this.ctx.fillStyle = 'rgba(13, 22, 58, ' + (0.22 * night).toFixed(3) + ')';
      this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  pipeBody(x, y, w, h) {
    if (h <= 0) return;
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
    gradient.addColorStop(0, '#4e9a34');
    gradient.addColorStop(0.3, '#8fd14f');
    gradient.addColorStop(0.65, '#63b041');
    gradient.addColorStop(1, '#3d7a28');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#2c5e1d';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  pipeCap(x, y, w, h) {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
    gradient.addColorStop(0, '#57a63a');
    gradient.addColorStop(0.3, '#9fdc63');
    gradient.addColorStop(0.65, '#6cb849');
    gradient.addColorStop(1, '#427f2d');
    ctx.fillStyle = gradient;
    roundRectPath(ctx, x, y, w, h, 5);
    ctx.fill();
    ctx.strokeStyle = '#2c5e1d';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawPipe(pipe) {
    const capH = 24;
    const pad = 4;
    const w = pipe.width;
    const x = pipe.x;

    // Top pipe: body above the lip, lip at the gap edge
    this.pipeBody(x, 0, w, Math.max(pipe.topHeight - capH, 0));
    this.pipeCap(x - pad, pipe.topHeight - capH, w + pad * 2, capH);

    // Bottom pipe: lip at the gap edge, body down to the ground line
    this.pipeCap(x - pad, pipe.bottomY, w + pad * 2, capH);
    this.pipeBody(x, pipe.bottomY + capH, w, Math.max(this.groundTop - pipe.bottomY - capH, 0));
  }

  drawBird(bird, state, time) {
    const ctx = this.ctx;
    const r = bird.radius;
    const playing = state === GameState.PLAYING;
    const tilt = playing
      ? clamp(bird.vy * 0.0018, -0.5, 1.15)
      : Math.sin(time * 2.6) * 0.08;

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(tilt);

    // Body
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#7a4f12';
    ctx.stroke();

    // Belly
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.ellipse(2, r * 0.38, r * 0.6, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing (flaps faster while playing)
    const wingOffset = Math.sin(time * (playing ? 20 : 7)) * (playing ? 3.4 : 1.6);
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, wingOffset, r * 0.5, r * 0.32, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.38, -r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(r * 0.46, -r * 0.3, r * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.05);
    ctx.lineTo(r * 1.35, r * 0.12);
    ctx.lineTo(r * 0.68, r * 0.42);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
