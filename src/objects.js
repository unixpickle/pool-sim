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

const BALL_SOLID = 0;
const BALL_STRIPE = 1;

class Ball extends Particle {
  constructor(x, y, radius, number) {
    super(x, y);
    this.radius = radius;
    this.number = number;
  }

  ballType() {
    if (this.number <= 8) {
      return BALL_SOLID;
    } else {
      return BALL_STRIPE;
    }
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

  collision(ball) {
    if (ball === this) {
      return null;
    }

    const normalX = ball.x - this.x;
    const normalY = ball.y - this.y;
    const thresh = this.radius + ball.radius;

    // Heuristic to prune out most checks.
    if (normalX >= thresh || normalX <= -thresh || normalY >= thresh || normalY <= -thresh) {
      return null;
    }

    const dist = Math.sqrt(Math.pow(normalX, 2) + Math.pow(normalY, 2));
    if (dist >= thresh) {
      return null;
    }
    const invMag = 1 / dist;
    return new Collision([invMag * normalX, invMag * normalY]);
  }

  containsPoint(x, y) {
    const dist = Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2));
    return dist <= this.radius;
  }

  hitsLine(x1, y1, x2, y2) {
    const vx = x2 - x1;
    const vy = y2 - y1;

    // Quadratic formula for ax^2 + bx + c.
    const a = vx * vx + vy * vy;
    const b = 2 * ((vx * x1 + vy * y1) - (vx * this.x + vy * this.y));
    const c = (this.x * this.x + this.y * this.y) + (x1 * x1 + y1 * y1) -
      (this.radius * this.radius) - 2 * (this.x * x1 + this.y * y1);

    const sqrtBody = (b * b - 4 * a * c);
    if (sqrtBody < 0) {
      return false;
    }

    const t1 = (-b + Math.sqrt(sqrtBody)) / (2 * a);
    const t2 = (-b - Math.sqrt(sqrtBody)) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
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
  constructor(x, y, width, height, normal) {
    super();
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.normal = normal;
  }

  draw(ctx) {
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  collision(ball) {
    // Heuristic to prune out most checks.
    if (ball.x - ball.radius > this.x + this.width) {
      return null;
    } else if (ball.y - ball.radius > this.y + this.height) {
      return null;
    } else if (ball.x + ball.radius < this.x) {
      return null;
    } else if (ball.y + ball.radius < this.y) {
      return null;
    }

    if (this.containsPoint(ball.x, ball.y) ||
      ball.containsPoint(this.x, this.y) ||
      ball.containsPoint(this.x + this.width, this.y) ||
      ball.containsPoint(this.x, this.y + this.height) ||
      ball.containsPoint(this.x + this.width, this.y + this.height) ||
      ball.hitsLine(this.x, this.y, this.x + this.width, this.y) ||
      ball.hitsLine(this.x, this.y, this.x, this.y + this.height) ||
      ball.hitsLine(this.x + this.width, this.y, this.x + this.width, this.y + this.height) ||
      ball.hitsLine(this.x, this.y + this.height, this.x + this.width, this.y + this.height)) {
      return new Collision(this.normal.slice());
    }
    return null;
  }

  containsPoint(x, y) {
    return (x >= this.x && x <= this.x + this.width && y >= this.y && y <= this.y + this.height);
  }
}

class TriangleBarrier extends Barrier {
  constructor(x1, y1, x2, y2) {
    super();
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;

    const midX = (this.x1 + this.x2) / 2;
    const midY = (this.y1 + this.y2) / 2;
    const normalX = midX - this.x3();
    const normalY = midY - this.y3();
    const invMag = 1 / Math.sqrt(Math.pow(normalX, 2) + Math.pow(normalY, 2));
    this.normal = [invMag * normalX, invMag * normalY];

    this.midpoint = { x: midX, y: midY };
    this.radius = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
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

  collision(ball) {
    // Heuristic to prune out most checks.
    const thresh = this.radius + ball.radius;
    if (Math.abs(ball.x - this.midpoint.x) > thresh) {
      return null;
    }
    if (Math.abs(ball.y - this.midpoint.y) > thresh) {
      return null;
    }
    if (ball.distance(this.midpoint) > thresh) {
      return null;
    }

    if (this.containsPoint(ball.x, ball.y) ||
      ball.containsPoint(this.x1, this.y1) ||
      ball.containsPoint(this.x2, this.y2) ||
      ball.containsPoint(this.x3(), this.y3()) ||
      ball.hitsLine(this.x1, this.y1, this.x2, this.y2) ||
      ball.hitsLine(this.x2, this.y2, this.x3(), this.y3()) ||
      ball.hitsLine(this.x3(), this.y3(), this.x1, this.y1)) {
      return new Collision(this.normal.slice());
    }
    return null;
  }

  containsPoint(x, y) {
    // TODO: this.
    return false;
  }
}

class Sink {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  sink(ball) {
    const dist = Math.sqrt(Math.pow(this.x - ball.x, 2) + Math.pow(this.y - ball.y, 2));
    return dist < this.radius;
  }
}
