const poolsim = require('../build/poolsim.js');

const agent = new poolsim.DiscreteSearchAgent(100);

function outputDatum(game, action) {
  process.stdout.write(JSON.stringify({
    live: game.serialize(),
    action: action.serialize(),
  }) + '\n');
}

function runGame() {
  const game = new poolsim.Game();
  while (game.winner() === null) {
    while (game.actionType() !== null) {
      const actions = agent.pickActions(game);
      actions.forEach((action) => outputDatum(game, action));
      game.act(actions[0]);
    }
    game.stepFully();
  }
}

while (true) {
  runGame();
}
