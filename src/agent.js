class Agent {
  pickAction(game) {
    throw new Error('not implemented');
  }
}

class RandomAgent {
  pickAction(game) {
    return game.actionType().sample();
  }
}

class FastRandomAgent {
  pickAction(game) {
    const action = game.actionType().sample();
    if (action instanceof ShootAction) {
      action.power = 1;
    }
    return action;
  }
}
