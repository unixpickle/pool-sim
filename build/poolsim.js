(function() {
// Physics simulator adapted to 2D from:
// https://github.com/unixpickle/learn-gfx/blob/fd17c2a5e5e3439993a3d54fd1c9230a5cfb8e37/src/physics.js

// An abstract particle class with a physics state.
class Particle {
  constructor(x, y, vx, vy) {
    this.x = x || 0;
    this.y = y || 0;
    this.vx = vx || 0;
    this.vy = vy || 0;
  }

  energy() {
    return Math.pow(this.vx, 2) + Math.pow(this.vy, 2);
  }

  distance(p1) {
    return Math.sqrt(Math.pow(this.x - p1.x, 2) + Math.pow(this.y - p1.y, 2));
  }
}

// An abstract base class for something which computes the
// force on every particle in a particle system.
class ForceField {
  // Compute the forces on each particle.
  // The result is an array of arrays, where each inner
  // array is of the form [x, y].
  forces(particles) {
    throw new Error('not implemented');
  }
}

// A large vector of positions and velocities for every
// particle in a system. Can also be used to represent the
// derivatives of said values.
class PhysicsVector {
  constructor(positions, velocities) {
    this.positions = positions;
    this.velocities = velocities;
  }

  static fromParticles(particles) {
    const positions = [];
    const velocities = [];
    particles.forEach((p) => {
      positions.push([p.x, p.y]);
      velocities.push([p.vx, p.vy]);
    });
    return new PhysicsVector(positions, velocities);
  }

  static fromDerivative(particles, field) {
    const positions = [];
    const velocities = [];
    const forces = field.forces(particles);
    particles.forEach((p, i) => {
      positions.push([p.vx, p.vy]);
      velocities.push(forces[i]);
    });
    return new PhysicsVector(positions, velocities);
  }

  copy() {
    const positions = this.positions.map((p) => [p[0], p[1]]);
    const velocities = this.velocities.map((v) => [v[0], v[1]]);
    return new PhysicsVector(positions, velocities);
  }

  scale(x) {
    this.positions.forEach((p) => {
      p[0] *= x;
      p[1] *= x;
    });
    this.velocities.forEach((v) => {
      v[0] *= x;
      v[1] *= x;
    });
    return this;
  }

  addTo(particles) {
    particles.forEach((p, i) => {
      const pos = this.positions[i];
      p.x += pos[0];
      p.y += pos[1];
      const vel = this.velocities[i];
      p.vx += vel[0];
      p.vy += vel[1];
    });
  }

  copyTo(particles) {
    particles.forEach((p, i) => {
      const pos = this.positions[i];
      p.x = pos[0];
      p.y = pos[1];
      const vel = this.velocities[i];
      p.vx = vel[0];
      p.vy = vel[1];
    });
  }
}

// Perform a step of Euler's method on the system.
function eulerStep(particles, field, dt) {
  const delta = PhysicsVector.fromDerivative(particles, field);
  delta.scale(dt);
  delta.addTo(particles);
}

// Perform a step of the RK4 method on the system.
function rk4Step(particles, field, dt) {
  const k1 = PhysicsVector.fromDerivative(particles, field).scale(dt);
  const k2 = withBackup(particles, () => {
    k1.copy().scale(0.5).addTo(particles);
    return PhysicsVector.fromDerivative(particles, field).scale(dt);
  });
  const k3 = withBackup(particles, () => {
    k2.copy().scale(0.5).addTo(particles);
    return PhysicsVector.fromDerivative(particles, field).scale(dt);
  })
  const k4 = withBackup(particles, () => {
    k3.addTo(particles);
    return PhysicsVector.fromDerivative(particles, field).scale(dt);
  })
  k1.scale(1 / 6).addTo(particles);
  k2.scale(2 / 6).addTo(particles);
  k3.scale(2 / 6).addTo(particles);
  k4.scale(1 / 6).addTo(particles);
}

function withBackup(particles, f) {
  const backup = PhysicsVector.fromParticles(particles);
  const res = f();
  backup.copyTo(particles);
  return res;
}
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
    const dist = Math.sqrt(Math.pow(this.x - ball.x, 2) + Math.pow(this.y - ball.y, 2));
    if (dist >= this.radius + ball.radius) {
      return null;
    }
    const normalX = ball.x - this.x;
    const normalY = ball.y - this.y;
    const invMag = 1 / Math.sqrt(Math.pow(normalX, 2) + Math.pow(normalY, 2));
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
const TABLE_WIDTH = 0.5;
const TABLE_HEIGHT = 1.0;
const BALL_RADIUS = (21 / 8 / 88 / 2);
const BALL_SPACE = 0.001;
const CORNER_SPACE = 0.05;
const POCKET_SIZE = 0.05;
const GREEN_PAD = 0.02;
const WALL_WIDTH = 0.12;
const TRIANGLE_SIZE = 0.02;
const COLLISION_FORCE = 100;
const MAX_TIMESTEP = 1 / 10000;
const FRICTION = 0.01;
const SIDE_SINK_SIZE = 0.04;
const SIDE_SINK_OFFSET = 0.045;
const CORNER_SINK_SIZE = 0.051;
const CORNER_SINK_OFFSET = 0.02;

// The raw game dynamics for pool. Does not include rules,
// just hitting balls into pockets.
class Table extends ForceField {
  constructor() {
    super();
    this.whiteBall = new Ball(TABLE_WIDTH / 2, TABLE_HEIGHT * 0.8, BALL_RADIUS, 0);
    this.liveBalls = [this.whiteBall];
    this.sunkBalls = [];
    this.barriers = [];
    this.sinks = [];
    this._createLiveBalls();
    this._createBarriers();
    this._createSinks();
  }

  draw(ctx) {
    ctx.fillStyle = 'black';
    ctx.fillRect(-WALL_WIDTH, -WALL_WIDTH, TABLE_WIDTH + WALL_WIDTH * 2, TABLE_HEIGHT + WALL_WIDTH * 2);
    ctx.fillStyle = 'green';
    ctx.fillRect(-GREEN_PAD, -GREEN_PAD, TABLE_WIDTH + GREEN_PAD * 2, TABLE_HEIGHT + GREEN_PAD * 2);
    ctx.fillStyle = 'black';
    this.sinks.forEach((b) => b.draw(ctx));
    this.liveBalls.forEach((b) => b.draw(ctx));
    ctx.fillStyle = 'brown';
    this.barriers.forEach((b) => b.draw(ctx));
  }

  step(time) {
    const sunkBalls = [];
    const numSteps = Math.ceil(time / MAX_TIMESTEP);
    const stepSize = time / numSteps;
    for (let i = 0; i < numSteps; ++i) {
      rk4Step(this.liveBalls, this, stepSize);
      sunkBalls.push.apply(sunkBalls, this.sinkBalls());
    }
    return sunkBalls;
  }

  halted() {
    return !this.liveBalls.some((ball) => ball.energy() > 1e-6);
  }

  forces(particles) {
    const objects = this.liveBalls.slice();
    objects.push.apply(objects, this.barriers);
    return particles.map((p) => {
      let forceX = 0;
      let forceY = 0;
      objects.forEach((obj) => {
        const collision = obj.collision(p);
        if (collision !== null) {
          forceX += COLLISION_FORCE * collision.normal[0];
          forceY += COLLISION_FORCE * collision.normal[1];
        }
      });
      let dampX = -p.vx;
      let dampY = -p.vy;
      const mag = Math.sqrt(Math.pow(dampX, 2) + Math.pow(dampY, 2));
      if (mag > 1e-8) {
        dampX /= mag;
        dampY /= mag;
        dampX *= FRICTION;
        dampY *= FRICTION;
      }
      return [forceX + dampX, forceY + dampY];
    });
  }

  sinkBalls() {
    const res = [];
    for (let i = 0; i < this.liveBalls.length; ++i) {
      const ball = this.liveBalls[i];
      if (ball.x < -GREEN_PAD || ball.x >= TABLE_WIDTH + GREEN_PAD ||
        ball.y < -GREEN_PAD || ball.y >= TABLE_HEIGHT + GREEN_PAD ||
        this.sinks.some((s) => s.sink(ball))) {
        res.push(ball);
        this.sunkBalls.push(ball);
        this.liveBalls.splice(i, 1);
        --i;
      }
    }
    return res;
  }

  _createLiveBalls() {
    let ballNumber = 15;
    for (let row = 0; row < 5; ++row) {
      const count = 5 - row;
      const rowY = TABLE_HEIGHT * 0.2 + BALL_RADIUS * 2 * row;
      const rowX = TABLE_WIDTH / 2 - (2 * BALL_RADIUS + BALL_SPACE) * (count - 1) / 2;
      for (let i = 0; i < count; ++i) {
        const ball = new Ball(rowX + i * (BALL_RADIUS * 2 + BALL_SPACE), rowY,
          BALL_RADIUS, ballNumber--);
        this.liveBalls.push(ball);
      }
    }
  }

  _createBarriers() {
    const cs2 = CORNER_SPACE * 2;
    this.barriers.push(new RectBarrier(CORNER_SPACE, -WALL_WIDTH, TABLE_WIDTH - cs2, WALL_WIDTH,
      [0, 1]));
    this.barriers.push(new RectBarrier(CORNER_SPACE, TABLE_HEIGHT, TABLE_WIDTH - cs2, WALL_WIDTH,
      [0, -1]));
    [-WALL_WIDTH, TABLE_WIDTH].forEach((x) => {
      const normal = (x < 0 ? [1, 0] : [-1, 0]);
      this.barriers.push(new RectBarrier(x, CORNER_SPACE, WALL_WIDTH,
        TABLE_HEIGHT / 2 - CORNER_SPACE - POCKET_SIZE, normal));
      this.barriers.push(new RectBarrier(x, TABLE_HEIGHT / 2 + POCKET_SIZE, WALL_WIDTH,
        TABLE_HEIGHT / 2 - CORNER_SPACE - POCKET_SIZE, normal));
    });

    // Left triangles.
    this.barriers.push(new TriangleBarrier(-TRIANGLE_SIZE,
      TABLE_HEIGHT / 2 - POCKET_SIZE + TRIANGLE_SIZE, 0, TABLE_HEIGHT / 2 - POCKET_SIZE));
    this.barriers.push(new TriangleBarrier(-TRIANGLE_SIZE,
      TABLE_HEIGHT / 2 + POCKET_SIZE - TRIANGLE_SIZE, 0, TABLE_HEIGHT / 2 + POCKET_SIZE));

    // Right triangles.
    this.barriers.push(new TriangleBarrier(TABLE_WIDTH + TRIANGLE_SIZE,
      TABLE_HEIGHT / 2 - POCKET_SIZE + TRIANGLE_SIZE, TABLE_WIDTH, TABLE_HEIGHT / 2 - POCKET_SIZE));
    this.barriers.push(new TriangleBarrier(TABLE_WIDTH + TRIANGLE_SIZE,
      TABLE_HEIGHT / 2 + POCKET_SIZE - TRIANGLE_SIZE, TABLE_WIDTH, TABLE_HEIGHT / 2 + POCKET_SIZE));

    // Top-left triangles.
    this.barriers.push(new TriangleBarrier(CORNER_SPACE, 0, CORNER_SPACE - TRIANGLE_SIZE,
      -TRIANGLE_SIZE));
    this.barriers.push(new TriangleBarrier(-TRIANGLE_SIZE, CORNER_SPACE - TRIANGLE_SIZE,
      0, CORNER_SPACE));

    // Top-right triangles.
    this.barriers.push(new TriangleBarrier(TABLE_WIDTH - CORNER_SPACE, 0,
      TABLE_WIDTH - CORNER_SPACE + TRIANGLE_SIZE, -TRIANGLE_SIZE));
    this.barriers.push(new TriangleBarrier(TABLE_WIDTH + TRIANGLE_SIZE,
      CORNER_SPACE - TRIANGLE_SIZE, TABLE_WIDTH, CORNER_SPACE));

    // Bottom-left triangles.
    this.barriers.push(new TriangleBarrier(-TRIANGLE_SIZE,
      TABLE_HEIGHT - CORNER_SPACE + TRIANGLE_SIZE, 0, TABLE_HEIGHT - CORNER_SPACE));
    this.barriers.push(new TriangleBarrier(CORNER_SPACE, TABLE_HEIGHT, CORNER_SPACE - TRIANGLE_SIZE,
      TABLE_HEIGHT + TRIANGLE_SIZE));

    // Bottom-right triangles.
    this.barriers.push(new TriangleBarrier(TABLE_WIDTH - CORNER_SPACE, TABLE_HEIGHT,
      TABLE_WIDTH - CORNER_SPACE + TRIANGLE_SIZE, TABLE_HEIGHT + TRIANGLE_SIZE));
    this.barriers.push(new TriangleBarrier(TABLE_WIDTH + TRIANGLE_SIZE,
      TABLE_HEIGHT - CORNER_SPACE + TRIANGLE_SIZE, TABLE_WIDTH, TABLE_HEIGHT - CORNER_SPACE));
  }

  _createSinks() {
    // Side sinks.
    this.sinks.push(new Sink(-SIDE_SINK_OFFSET, TABLE_HEIGHT / 2, SIDE_SINK_SIZE));
    this.sinks.push(new Sink(TABLE_WIDTH + SIDE_SINK_OFFSET, TABLE_HEIGHT / 2, SIDE_SINK_SIZE));

    // Corner sinks.
    this.sinks.push(new Sink(-CORNER_SINK_OFFSET, -CORNER_SINK_OFFSET, CORNER_SINK_SIZE));
    this.sinks.push(new Sink(TABLE_WIDTH + CORNER_SINK_OFFSET, -CORNER_SINK_OFFSET,
      CORNER_SINK_SIZE));
    this.sinks.push(new Sink(TABLE_WIDTH + CORNER_SINK_OFFSET, TABLE_HEIGHT + CORNER_SINK_OFFSET,
      CORNER_SINK_SIZE));
    this.sinks.push(new Sink(-CORNER_SINK_OFFSET, TABLE_HEIGHT + CORNER_SINK_OFFSET,
      CORNER_SINK_SIZE));
  }
}
const exported = {
  Particle: Particle,
  ForceField: ForceField,
  eulerStep: eulerStep,
  rk4Step: rk4Step,

  Ball: Ball,
  Collision: Collision,
  Barrier: Barrier,
  RectBarrier: RectBarrier,
  TriangleBarrier: TriangleBarrier,
  Sink: Sink,

  TABLE_WIDTH: TABLE_WIDTH,
  TABLE_HEIGHT: TABLE_HEIGHT,
  BALL_RADIUS: BALL_RADIUS,
  Table: Table,
};

if ('undefined' !== typeof window) {
  window.poolsim = exported;
} else {
  module.exports = exported;
}
})();
