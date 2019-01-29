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

// The raw game dynamics for pool. Does not include rules,
// just hitting balls into pockets.
class Table extends ForceField {
  constructor() {
    super();
    this.whiteBall = new Ball(TABLE_WIDTH / 2, TABLE_HEIGHT * 0.8, BALL_RADIUS, 0);
    this.liveBalls = [this.whiteBall];
    this.sunkBalls = [];
    this.barriers = [];
    this._createLiveBalls();
    this._createBarriers();
  }

  draw(ctx) {
    ctx.fillStyle = 'black';
    ctx.fillRect(-WALL_WIDTH, -WALL_WIDTH, TABLE_WIDTH + WALL_WIDTH * 2, TABLE_HEIGHT + WALL_WIDTH * 2);
    ctx.fillStyle = 'green';
    ctx.fillRect(-GREEN_PAD, -GREEN_PAD, TABLE_WIDTH + GREEN_PAD * 2, TABLE_HEIGHT + GREEN_PAD * 2);
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
      return [forceX, forceY];
    });
  }

  sinkBalls() {
    const res = [];
    for (let i = 0; i < this.liveBalls.length; ++i) {
      const ball = this.liveBalls[i];
      if (ball.x < -GREEN_PAD || ball.x >= TABLE_WIDTH + GREEN_PAD ||
        ball.y < -GREEN_PAD || ball.y >= TABLE_HEIGHT + GREEN_PAD) {
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
}
