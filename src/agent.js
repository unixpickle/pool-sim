class Agent {
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
  }

  pickAction(game) {
    let bestChoice = null;
    let bestHeuristic = -Infinity;
    for (let i = -1; i < this.numChoices; ++i) {
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
