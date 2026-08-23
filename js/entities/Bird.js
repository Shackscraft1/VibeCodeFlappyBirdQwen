/**
 * The player bird. Pure kinematics — no rendering, no sound.
 */
export class Bird {
  constructor(config) {
    const b = config.BIRD;
    this.x = b.X;
    this.y = b.BOB_Y;
    this.radius = b.RADIUS;
    this.gravity = b.GRAVITY;
    this.flapVelocity = b.FLAP;
    this.maxFallSpeed = b.MAX_FALL;
    this.vy = 0;
    this.dead = false;
  }

  flap() {
    if (!this.dead) this.vy = this.flapVelocity;
  }

  update(dt) {
    this.vy = Math.min(this.vy + this.gravity * dt, this.maxFallSpeed);
    this.y += this.vy * dt;
  }
}
