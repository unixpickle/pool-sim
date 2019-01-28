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
const TABLE_WIDTH = 0.5;
const TABLE_HEIGHT = 1.0;
const BALL_RADIUS = (21 / 8 / 88 / 2);
const CORNER_SPACE = 0.03;

// The raw game dynamics for pool. Does not include rules,
// just hitting balls into pockets.
class Table {
  constructor() {
    this.whiteBall = new Ball(TABLE_WIDTH / 2, TABLE_HEIGHT * 0.8, BALL_RADIUS, 0);
    this.liveBalls = [this.whiteBall];
    this.sunkBalls = [];
    this.barriers = [];
    this._createLiveBalls();
    this._createBarriers();
  }

  draw(ctx) {
    ctx.fillStyle = 'green';
    ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
    this.liveBalls.forEach((b) => b.draw(ctx));
    ctx.fillStyle = 'brown';
    this.barriers.forEach((b) => b.draw(ctx));
  }

  _createLiveBalls() {
    let ballNumber = 15;
    for (let row = 0; row < 5; ++row) {
      const count = 5 - row;
      const rowY = TABLE_HEIGHT * 0.2 + BALL_RADIUS * 2 * row;
      const rowX = TABLE_WIDTH / 2 - BALL_RADIUS * count;
      for (let i = 0; i < count; ++i) {
        const ball = new Ball(rowX + i * BALL_RADIUS * 2, rowY, BALL_RADIUS, ballNumber--);
        this.liveBalls.push(ball);
      }
    }
  }

  _createBarriers() {
    const cs2 = CORNER_SPACE * 2;
    this.barriers.push(new RectBarrier(CORNER_SPACE, -0.1, TABLE_WIDTH - cs2, 0.1));
    this.barriers.push(new RectBarrier(CORNER_SPACE, TABLE_HEIGHT, TABLE_WIDTH - cs2, 0.1));
    this.barriers.push(new RectBarrier(-0.1, CORNER_SPACE, 0.1, TABLE_HEIGHT - cs2));
    this.barriers.push(new RectBarrier(TABLE_WIDTH, CORNER_SPACE, 0.1, TABLE_HEIGHT - cs2));
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
