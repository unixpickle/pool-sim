class Agent {
  pickAction(game) {
    throw new Error('not implemented');
  }
}

class RandomAgent {
  pickAction(game) {
    return game.actionType().sample(game);
  }
}

class FastRandomAgent {
  pickAction(game) {
    const action = game.actionType().sample(game);
    if (action instanceof ShootAction) {
      action.power = 1;
    }
    return action;
  }
}
