const poolsim = require('../build/poolsim.js');

function runGame() {
  const game = new poolsim.Game();
  game.act(new poolsim.PlaceAction(0.25, 0.9));
  game.act(new poolsim.ShootScratchAction(-Math.PI / 2, 1));
  game.stepFully();
}

console.time('runGame');
for (let i = 0; i < 10; ++i) {
  runGame();
}
console.timeEnd('runGame');
