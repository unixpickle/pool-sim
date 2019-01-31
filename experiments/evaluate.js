const poolsim = require('../build/poolsim.js');

if (process.argv.length !== 4) {
  console.log('Usage: node evaluate.js <agent1> <agent2>');
  process.exit(1);
}

const agent1 = new poolsim[process.argv[2]]();
const agent2 = new poolsim[process.argv[3]]();

function runGame() {
  const game = new poolsim.Game();
  let numTurns = 0;
  while (game.winner() === null) {
    const agent = (game.turn() === 0 ? agent1 : agent2);
    while (game.actionType() !== null) {
      const action = agent.pickAction(game);
      game.act(action);
    }
    game.stepFully();
    ++numTurns;
  }
  return {
    numTurns: numTurns,
    winner: game.winner(),
  };
}

function runAverage() {
  const sum = {};
  let count = 0;
  while (true) {
    const result = runGame();
    Object.keys(result).forEach((key) => {
      if (!sum.hasOwnProperty(key)) {
        sum[key] = result[key];
      } else {
        sum[key] += result[key];
      }
    });
    ++count;
    console.log('');
    Object.keys(sum).sort().forEach((key) => {
      console.log(key + ': ' + sum[key] / count);
    });
  }
}

runAverage();
