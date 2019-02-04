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
    this.useAim = true;
  }

  pickAction(game) {
    return this.pickActions(game)[0];
  }

  pickActions(game) {
    let bestChoice = [];
    let bestHeuristic = -Infinity;
    for (let i = this.useAim ? -1 : 0; i < this.numChoices; ++i) {
      const clone = game.clone();
      const choice = this.generateChoice(clone, i === -1 ? new AimClosestAgent() : null);
      const heuristic = this.heuristic(clone, game.turn());
      if (heuristic > bestHeuristic) {
        bestHeuristic = heuristic;
        bestChoice = [choice];
      } else if (heuristic === bestHeuristic) {
        bestChoice.push(choice);
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

class DiscreteRandomAgent extends Agent {
  constructor() {
    super();
    this.angleChoices = [];
    this.placeChoices = [];
    for (let y = 0.8; y <= 0.9; y += 0.05) {
      for (let x = 0.1; x <= TABLE_WIDTH - 0.1; x += 0.1) {
        this.placeChoices.push([x, y]);
      }
    }
    for (let i = 0; i < 64; ++i) {
      this.angleChoices.push((i - 32) * Math.PI * 2 / 64);
    }
  }

  pickAction(game) {
    if (game.actionType() === ShootAction) {
      return new ShootAction(this._randomAngle(), 1);
    } else if (game.actionType() === ShootScratchAction) {
      while (true) {
        const angle = this._randomAngle();
        if (angle < 0) {
          return new ShootScratchAction(angle, 1);
        }
      }
    } else if (game.actionType() === PickPocketAction) {
      return PickPocketAction.sample();
    } else if (game.actionType() === PlaceAction) {
      const [x, y] = this._randomPlace();
      return new PlaceAction(x, y);
    }
  }

  _randomAngle() {
    const idx = Math.floor(Math.random() * this.angleChoices.length);
    return this.angleChoices[Math.min(idx, this.angleChoices.length - 1)];
  }

  _randomPlace() {
    const idx = Math.floor(Math.random() * this.placeChoices.length);
    return this.placeChoices[Math.min(idx, this.placeChoices.length - 1)];
  }
}

class DiscreteSearchAgent extends SearchAgent {
  constructor(numChoices) {
    super(new DiscreteRandomAgent(), numChoices || 10);
    this.useAim = false;
  }
}
