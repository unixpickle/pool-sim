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
