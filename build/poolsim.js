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
    const positions = particles.map((p) => [p.vx, p.vy]);
    const forces = field.forces(particles);
    return new PhysicsVector(positions, forces);
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

  addTo(particles, s) {
    particles.forEach((p, i) => {
      const pos = this.positions[i];
      p.x += pos[0] * s;
      p.y += pos[1] * s;
      const vel = this.velocities[i];
      p.vx += vel[0] * s;
      p.vy += vel[1] * s;
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
  delta.addTo(particles, dt);
}

// Perform a step of the RK4 method on the system.
function rk4Step(particles, field, dt) {
  const k1 = PhysicsVector.fromDerivative(particles, field);
  const k2 = withBackup(particles, () => {
    k1.addTo(particles, 0.5 * dt);
    return PhysicsVector.fromDerivative(particles, field);
  });
  const k3 = withBackup(particles, () => {
    k2.addTo(particles, 0.5 * dt);
    return PhysicsVector.fromDerivative(particles, field);
  })
  const k4 = withBackup(particles, () => {
    k3.addTo(particles, dt);
    return PhysicsVector.fromDerivative(particles, field);
  })
  k1.addTo(particles, dt / 6);
  k2.addTo(particles, dt * 2 / 6);
  k3.addTo(particles, dt * 2 / 6);
  k4.addTo(particles, dt / 6);
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
const MAX_TIMESTEP = 1 / 1000;
const FRICTION = 0.2;
const SIDE_SINK_SIZE = 0.04;
const SIDE_SINK_OFFSET = 0.045;
const CORNER_SINK_SIZE = 0.051;
const CORNER_SINK_OFFSET = 0.02;

class SinkResult {
  constructor(ball) {
    this.ball = ball;
  }

  pocket() {
    const column = this.ball.x < TABLE_WIDTH / 2 ? 0 : 1;
    const row = this.ball.y < TABLE_HEIGHT / 3 ? 0 : (this.ball.y > TABLE_HEIGHT * 2 / 3 ? 2 : 1);
    return row * 2 + column;
  }
}

class StepResult {
  constructor(sunk, hits) {
    this.sunk = sunk;
    this.hits = hits;
  }
}

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
    this._whiteHits = [];
    this._createLiveBalls();
    this._createBarriers();
    this._createSinks();
  }

  clone() {
    const res = new Table();
    const newBalls = res.liveBalls.concat(res.sunkBalls);
    const ourBalls = this.liveBalls.concat(this.sunkBalls);
    newBalls.sort((x, y) => x.number - y.number);
    ourBalls.sort((x, y) => x.number - y.number);
    ourBalls.forEach((ourBall, i) => {
      const newBall = newBalls[i];
      newBall.x = ourBall.x;
      newBall.y = ourBall.y;
      newBall.vx = ourBall.vx;
      newBall.vy = ourBall.vy;
    });
    res.liveBalls = this.liveBalls.map((b) => newBalls[b.number]);
    res.sunkBalls = this.sunkBalls.map((b) => newBalls[b.number]);
    return res;
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
    const hitWhite = [];
    const sunkBalls = [];
    const numSteps = Math.ceil(time / MAX_TIMESTEP);
    const stepSize = time / numSteps;
    for (let i = 0; i < numSteps; ++i) {
      this._whiteHits = [];
      rk4Step(this.liveBalls, this, stepSize);
      this._whiteHits.forEach((ball) => {
        if (hitWhite.indexOf(ball) < 0) {
          hitWhite.push(ball);
        }
      });
      sunkBalls.push.apply(sunkBalls, this.sinkBalls());
    }
    return new StepResult(sunkBalls, hitWhite);
  }

  halted() {
    return !this.liveBalls.some((ball) => ball.energy() > 1e-6);
  }

  forces(particles) {
    const objects = this.liveBalls.concat(this.barriers);
    return particles.map((p) => {
      let forceX = 0;
      let forceY = 0;
      objects.forEach((obj) => {
        const collision = obj.collision(p);
        if (collision !== null) {
          forceX += COLLISION_FORCE * collision.normal[0];
          forceY += COLLISION_FORCE * collision.normal[1];
          if (obj === this.whiteBall) {
            this._whiteHits.push(p);
          }
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
        res.push(new SinkResult(ball));
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
// An action in a game.
class Action {
  toString() {
    throw new Error('not implemented');
  }

  static sample(game) {
    throw new Error('not implemented');
  }

  serialize() {
    const res = { type: this.constructor.name };
    Object.keys(this).forEach((k) => res[k] = this[k]);
    return res;
  }

  static deserialize(object) {
    if (object.type === 'ShootAction') {
      return new ShootAction(object.angle, object.power);
    } else if (object.type === 'ShootScratchAction') {
      return new ShootScratchAction(object.angle, object.power);
    } else if (object.type === 'PlaceAction') {
      return new PlaceAction(object.x, object.y);
    } else if (object.type === 'PickPocketAction') {
      return new PickPocketAction(object.index);
    } else {
      throw new Error('unknown type: ' + object.type);
    }
  }
}

class ShootAction extends Action {
  constructor(angle, power) {
    super();
    this.angle = angle;
    this.power = power;
  }

  toString() {
    return 'Shoot(angle=' + this.angle + ', power=' + this.power + ')';
  }

  static sample(game) {
    return new ShootAction(Math.random() * Math.PI * 2, Math.random());
  }
}

class ShootScratchAction extends ShootAction {
  constructor(angle, power) {
    super(angle, power);
    if (Math.sin(angle) > 0) {
      throw new Error('bad angle');
    }
  }

  static sample(game) {
    return new ShootScratchAction(-Math.random() * Math.PI, Math.random());
  }
}

class PlaceAction extends Action {
  constructor(x, y) {
    super();
    this.x = x;
    this.y = y;
  }

  toString() {
    return 'Place(x=' + this.x + ', ' + this.y + ')';
  }

  static sample(game) {
    const minX = 0.1;
    const maxX = TABLE_WIDTH - 0.1;
    const minY = 0.8;
    const maxY = 0.95;
    while (true) {
      const x = Math.random() * (maxX - minX) + minX;
      const y = Math.random() * (maxY - minY) + minY;
      if (!game.table.liveBalls.some((b) => b.distance({ x: x, y: y }) <= BALL_RADIUS * 2)) {
        return new PlaceAction(x, y);
      }
    }
  }
}

class PickPocketAction extends Action {
  constructor(index) {
    super();
    this.index = index;
  }

  toString() {
    return 'PickPocket(index=' + this.index + ')';
  }

  static sample(game) {
    return new PickPocketAction(Math.min(5, Math.floor(Math.random() * 6)));
  }
}

// The game state, including information about the next
// available action.
class Game {
  constructor() {
    this.table = new Table();

    this._winner = null;
    this._turn = 0;
    this._firstPlayerType = null;

    // Work together to tell if turn changes and if the
    // player scratched.
    this._keepTurn = false;
    this._hitOwn = false;

    // If we are up to the eight ball.
    this._guessedPocket = null;

    // Indicate that the ball must be shot forward.
    this._shootScratch = false;

    this._sinkWhite();
  }

  clone() {
    const res = new Game();
    res.table = this.table.clone();
    const fields = ['_winner', '_turn', '_firstPlayerType', '_keepTurn', '_hitOwn',
      '_guessedPocket', '_shootScratch'];
    fields.forEach((k) => res[k] = this[k]);
    return res;
  }

  serialize() {
    return this.table.liveBalls.map((b) => {
      return { number: b.number, x: b.x, y: b.y };
    });
  }

  winner() {
    return this._winner;
  }

  turn() {
    return this._turn;
  }

  actionType() {
    if (!this.table.halted() || this._winner !== null) {
      return null;
    } else if (this.sunkWhite()) {
      return PlaceAction;
    } else if (this.upToLast() && this._guessedPocket === null) {
      return PickPocketAction;
    } else if (this._shootScratch) {
      return ShootScratchAction;
    } else {
      return ShootAction;
    }
  }

  act(action) {
    if (!(action instanceof this.actionType())) {
      throw new Error('invalid action type');
    }
    if (action instanceof ShootAction) {
      this.table.whiteBall.vx = Math.cos(action.angle) * action.power;
      this.table.whiteBall.vy = Math.sin(action.angle) * action.power;
    } else if (action instanceof PlaceAction) {
      this._shootScratch = true;
      this.table.whiteBall.x = action.x;
      this.table.whiteBall.y = action.y;
      this.table.whiteBall.vx = 0;
      this.table.whiteBall.vy = 0;
      this.table.sunkBalls.splice(this.table.sunkBalls.indexOf(this.table.whiteBall), 1);
      this.table.liveBalls.push(this.table.whiteBall);
    } else if (action instanceof PickPocketAction) {
      this._guessedPocket = action.index;
    }
  }

  step(seconds) {
    const result = this.table.step(seconds);

    result.hits.forEach((ball) => {
      if (this.wantsToHit(ball)) {
        this._hitOwn = true;
      }
    });

    result.sunk.forEach((sunk) => {
      if (this._winner !== null) {
        // Don't mess with the game state if the winner was
        // already determined.
      } else if (sunk.ball.number === 8) {
        if (sunk.pocket() !== this._guessedPocket) {
          this._winner = 1 - this._turn;
        }
      } else if (sunk.ball.number === 0) {
        if (this.sunkBlack()) {
          // We were waiting to see if we scratched.
          this._winner = 1 - this._turn;
        }
      } else if (this._firstPlayerType === null) {
        if (this._turn === 0) {
          this._firstPlayerType = sunk.ball.ballType();
        } else {
          this._firstPlayerType = 1 - sunk.ball.ballType();
        }
        this._keepTurn = true;
      } else if (this.correctType(sunk.ball)) {
        this._keepTurn = true;
        // Don't scratch even if we didn't hit our own ball.
        this._hitOwn = true;
      } else {
        this._keepTurn = false;
      }
    });
    if (this.table.halted()) {
      this._finishTurn();
      return true;
    } else {
      return false;
    }
  }

  stepFully() {
    while (!this.step(1 / 24)) {
    }
  }

  sunkBlack() {
    return this.table.sunkBalls.some((b) => b.number === 8);
  }

  sunkWhite() {
    return this.table.sunkBalls.some((b) => b.number === 0);
  }

  upToLast() {
    return !this.table.liveBalls.some((b) => this.correctType(b)) &&
      this.table.sunkBalls.length > 1;
  }

  correctType(ball) {
    if (ball.number === 8 || ball.number === 0) {
      return false;
    }
    return (ball.ballType() === this._firstPlayerType) === (this._turn === 0);
  }

  playerType() {
    if (this._firstPlayerType === null) {
      return null;
    }
    if (this._turn === 0) {
      return this._firstPlayerType;
    } else {
      return 1 - this._firstPlayerType;
    }
  }

  wantsToHit(ball) {
    return this._firstPlayerType === null || this.correctType(ball) ||
      (ball.number === 8 && this.upToLast());
  }

  _sinkWhite() {
    if (!this.sunkWhite()) {
      this.table.liveBalls.splice(this.table.liveBalls.indexOf(this.table.whiteBall), 1);
      this.table.sunkBalls.push(this.table.whiteBall);
    }
  }

  _finishTurn() {
    if (this._winner === null && this.sunkBlack()) {
      this._winner = this._turn;
    }
    if (!this._keepTurn || this.sunkWhite()) {
      this._turn = 1 - this._turn;
    }
    if (!this._hitOwn) {
      this._sinkWhite();
    }
    this._shootScratch = false;
    this._guessedPocket = null;
    this._keepTurn = false;
    this._hitOwn = false;
  }
}class Agent {
  pickAction(game) {
    throw new Error('not implemented');
  }
}

class RandomAgent extends Agent {
  pickAction(game) {
    return game.actionType().sample(game);
  }
}

class FastRandomAgent extends Agent {
  pickAction(game) {
    const action = game.actionType().sample(game);
    if (action instanceof ShootAction) {
      action.power = 1;
    }
    return action;
  }
}

class AimClosestAgent extends FastRandomAgent {
  pickAction(game) {
    const action = super.pickAction(game);
    let closestBall = null;
    if (action instanceof ShootScratchAction) {
      closestBall = this.closestBall(game, true);
    } else if (action instanceof ShootAction) {
      closestBall = this.closestBall(game, false);
    }
    if (closestBall === null) {
      return action;
    }
    action.angle = Math.atan2(closestBall.y - game.table.whiteBall.y,
      closestBall.x - game.table.whiteBall.x);
    return action;
  }

  closestBall(game, scratch) {
    let closestDist = Infinity;
    let closestBall = null;
    game.table.liveBalls.forEach((b) => {
      if (b.number === 0 || (scratch && b.y > game.table.whiteBall.y) || !game.wantsToHit(b)) {
        return;
      }
      const distance = b.distance(game.table.whiteBall);
      if (distance < closestDist) {
        closestDist = distance;
        closestBall = b;
      }
    });
    return closestBall;
  }
}

class SearchAgent extends Agent {
  constructor(chooser, numChoices) {
    super();
    this.chooser = chooser || new FastRandomAgent();
    this.numChoices = numChoices || 10;
    this.useAim = true;
  }

  pickAction(game) {
    let bestChoice = null;
    let bestHeuristic = -Infinity;
    for (let i = this.useAim ? -1 : 0; i < this.numChoices; ++i) {
      const clone = game.clone();
      const choice = this.generateChoice(clone, i === -1 ? new AimClosestAgent() : null);
      const heuristic = this.heuristic(clone, game.turn());
      if (heuristic > bestHeuristic) {
        bestHeuristic = heuristic;
        bestChoice = choice;
      }
    }
    return bestChoice;
  }

  generateChoice(game, chooser) {
    const actions = [];
    while (game.actionType() !== null) {
      const action = (chooser || this.chooser).pickAction(game);
      actions.push(action);
      game.act(action);
    }
    game.stepFully();
    return actions[0];
  }

  // Tell how good the game is for a player.
  heuristic(game, player) {
    if (game.winner() === player) {
      return Infinity;
    } else if (game.winner() === 1 - player) {
      return -Infinity;
    } else if (game.playerType() === null) {
      return 0;
    }

    let goodness = 0;
    game.table.sunkBalls.forEach((b) => {
      if (b.ballType() === game.playerType()) {
        goodness += 1;
      } else if (b.number !== 0) {
        goodness -= 1;
      }
    });
    if (game.turn() === player) {
      return goodness;
    } else {
      return -goodness;
    }
  }
}

class DiscreteRandomAgent extends Agent {
  constructor() {
    super();
    this.angleChoices = [];
    this.placeChoices = [];
    for (let y = 0.8; y <= 0.9; y += 0.05) {
      for (let x = 0.1; x <= TABLE_WIDTH - 0.1; x += 0.1) {
        this.placeChoices.push([x, y]);
      }
    }
    for (let i = 0; i < 64; ++i) {
      this.angleChoices.push((i - 32) * Math.PI * 2 / 64);
    }
  }

  pickAction(game) {
    if (game.actionType() === ShootAction) {
      return new ShootAction(this._randomAngle(), 1);
    } else if (game.actionType() === ShootScratchAction) {
      while (true) {
        const angle = this._randomAngle();
        if (angle < 0) {
          return new ShootScratchAction(angle, 1);
        }
      }
    } else if (game.actionType() === PickPocketAction) {
      return PickPocketAction.sample();
    } else if (game.actionType() === PlaceAction) {
      const [x, y] = this._randomPlace();
      return new PlaceAction(x, y);
    }
  }

  _randomAngle() {
    const idx = Math.floor(Math.random() * this.angleChoices.length);
    return this.angleChoices[Math.min(idx, this.angleChoices.length - 1)];
  }

  _randomPlace() {
    const idx = Math.floor(Math.random() * this.placeChoices.length);
    return this.placeChoices[Math.min(idx, this.placeChoices.length - 1)];
  }
}

class DiscreteSearchAgent extends SearchAgent {
  constructor(numChoices) {
    super(new DiscreteRandomAgent(), numChoices || 10);
    this.useAim = false;
  }
}
const exported = {
  Particle: Particle,
  ForceField: ForceField,
  eulerStep: eulerStep,
  rk4Step: rk4Step,

  BALL_SOLID: BALL_SOLID,
  BALL_STRIPE: BALL_STRIPE,
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

  Action: Action,
  ShootAction: ShootAction,
  ShootScratchAction: ShootScratchAction,
  PlaceAction: PlaceAction,
  PickPocketAction: PickPocketAction,
  Game: Game,

  RandomAgent: RandomAgent,
  FastRandomAgent: FastRandomAgent,
  AimClosestAgent: AimClosestAgent,
  SearchAgent: SearchAgent,
  DiscreteSearchAgent: DiscreteSearchAgent,
};

if ('undefined' !== typeof window) {
  window.poolsim = exported;
} else {
  module.exports = exported;
}
})();
