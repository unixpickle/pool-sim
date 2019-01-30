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
