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
  PlaceAction: PlaceAction,
  PickPocketAction: PickPocketAction,
  Game: Game,

  RandomAgent: RandomAgent,
  FastRandomAgent: FastRandomAgent,
  AimClosestAgent: AimClosestAgent,
  SearchAgent: SearchAgent,
};

if ('undefined' !== typeof window) {
  window.poolsim = exported;
} else {
  module.exports = exported;
}
