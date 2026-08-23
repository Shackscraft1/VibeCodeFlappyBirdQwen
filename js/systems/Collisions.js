import { clamp } from '../utils/math.js';

/** Circle vs axis-aligned rectangle. */
export function circleRectCollide(cx, cy, radius, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= radius * radius;
}

/** Does the bird touch either pipe of this pair? */
export function birdHitsPipe(bird, pipe) {
  const top = { x: pipe.x, y: 0, w: pipe.width, h: Math.max(pipe.topHeight, 0) };
  const bottom = {
    x: pipe.x,
    y: pipe.bottomY,
    w: pipe.width,
    h: Math.max(pipe.groundTop - pipe.bottomY, 0),
  };
  return (
    circleRectCollide(bird.x, bird.y, bird.radius, top) ||
    circleRectCollide(bird.x, bird.y, bird.radius, bottom)
  );
}
