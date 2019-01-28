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
