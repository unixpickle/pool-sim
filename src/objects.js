const BALL_COLORS = [
  'white',
  '#ffc900',
  '#002c52',
  '#b70016',
  '#37264a',
  '#ce3527',
  '#1b4329',
  '#542c2d',
  '#232323',
];

class Ball extends Particle {
  constructor(x, y, radius, number) {
    super(x, y);
    this.radius = radius;
    this.number = number;
    console.log(this.number);
  }

  draw(ctx) {
    if (this.number <= 8) {
      ctx.fillStyle = BALL_COLORS[this.number];
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.save();

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = 'white';
      ctx.fill();

      ctx.fillStyle = BALL_COLORS[this.number - 8];
      ctx.fillRect(this.x - this.radius, this.y - this.radius / 2, this.radius * 2, this.radius);

      ctx.restore();
    }
  }
}

class Collision {
  constructor(normal) {
    this.normal = normal;
  }
}

class Barrier {
  draw(ctx) {
    throw new Error('not implemented');
  }

  collision(ball) {
    throw new Error('not implemented');
  }
}

class RectBarrier extends Barrier {
  constructor(x, y, width, height) {
    super();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw(ctx) {
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

class TriangleBarrier extends Barrier {
  constructor(x1, y1, x2, y2) {
    super();
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  x3() {
    return this.x1;
  }

  y3() {
    return this.y2;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.lineTo(this.x3(), this.y3());
    ctx.closePath();
    ctx.fill();
  }
}
