const poolsim = require('../build/poolsim.js');

const agent = new poolsim.DiscreteSearchAgent(100);

function outputDatum(game, action) {
  const liveBalls = game.table.liveBalls.map((b) => {
    return { number: b.number, x: b.x, y: b.y };
  });
  const actionObj = { type: action.constructor.name };
  Object.keys(action).forEach((k) => actionObj[k] = action[k]);
  process.stdout.write(JSON.stringify({ live: liveBalls, action: actionObj }) + '\n');
}

function runGame() {
  const game = new poolsim.Game();
  while (game.winner() === null) {
    while (game.actionType() !== null) {
      const action = agent.pickAction(game);
      outputDatum(game, action);
      game.act(action);
    }
    game.stepFully();
  }
}

while (true) {
  runGame();
}
