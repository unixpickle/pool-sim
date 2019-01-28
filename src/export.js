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
