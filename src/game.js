// An action in a game.
class Action {
  toString() {
    throw new Error('not implemented');
  }

  static sample() {
    throw new Error('not implemented');
  }
}

class ShootAction extends Action {
  constructor(angle, power) {
    this.angle = angle;
    this.power = power;
  }

  toString() {
    return 'Shoot(angle=' + this.angle + ', power=' + this.power + ')';
  }

  static sample() {
    return new ShootAction(Math.random() * Math.PI * 2, Math.random());
  }
}

class PlaceAction extends Action {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  toString() {
    return 'Place(x=' + this.x + ', ' + this.y + ')';
  }

  static sample() {
    const minX = 0.1;
    const maxX = 0.9;
    const minY = 0.8;
    const maxY = 0.95;
    return new PlaceAction(Math.random() * (maxX - minX) + minX,
      Math.random() * (maxY - minY) + minY);
  }
}

class PickPocketAction extends Action {
  constructor(index) {
    this.index = index;
  }

  toString() {
    return 'PickPocket(index=' + this.index + ')';
  }

  static sample() {
    return new PickPocketAction(Math.min(5, Math.floor(Math.random() * 6)));
  }
}

// The game state, including information about the next
// available action.
class Game {
  constructor() {
    this.table = new Table();

    this._winner = null;
    this._turn = 0;
    this._firstPlayerType = null;

    // Work together to tell if turn changes and if the
    // player scratched.
    this._keepTurn = false;
    this._hitOwn = false;

    // If we are up to the eight ball.
    this._guessedPocket = null;
  }

  winner() {
    return this._winner;
  }

  turn() {
    return this._turn;
  }

  actionType() {
    if (!this.table.halted() || this._winner !== null) {
      return null;
    } else if (this.sunkWhite()) {
      return PlaceAction;
    } else if (this.upToLast() && this._guessedPocket === null) {
      return PickPocketAction;
    } else {
      return ShootAction;
    }
  }

  act(action) {
    if (!(action instanceof this.actionType())) {
      throw new Error('invalid action type');
    }
    if (action instanceof ShootAction) {
      this.table.whiteBall.vx = Math.cos(action.angle) * action.power;
      this.table.whiteBall.vy = Math.cos(action.angle) * action.power;
    } else if (action instanceof PlaceAction) {
      this.table.whiteBall.x = action.x;
      this.table.whiteBall.y = action.y;
      this.table.sunkBalls.splice(this.table.sunkBalls.indexOf(this.table.whiteBall), 1);
      this.table.liveBalls.push(this.table.whiteBall);
    } else if (action instanceof PickPocketAction) {
      this._guessedPocket = action.pocket;
    }
  }

  step(seconds) {
    const result = this.table.step(seconds);

    result.hits.forEach((ball) => {
      if (this._firstPlayerType === null) {
        this._hitOwn = true;
      } else if (this.correctType(ball)) {
        this._hitOwn = true;
      } else if (ball.number === 8 && this.upToLast()) {
        this._hitOwn = true;
      }
    });

    result.sunk.forEach((sunk) => {
      if (this._winner !== null) {
        // Don't mess with the game state if the winner was
        // already determined.
      } else if (sunk.ball.number === 8) {
        if (sunk.pocket() !== this._guessedPocket) {
          this._winner = 1 - this._turn;
        }
      } else if (sunk.ball.number === 0) {
        if (this.sunkBlack()) {
          // We were waiting to see if we scratched.
          this._winner = 1 - this._turn;
        }
      } else if (this._firstPlayerType === null) {
        if (this._turn === 0) {
          this._firstPlayerType = sunk.ball.ballType();
        } else {
          this._firstPlayerType = 1 - sunk.ball.ballType();
        }
        this._keepTurn = true;
      } else if (this.correctType(ball)) {
        this._keepTurn = true;
      } else {
        this._keepTurn = false;
      }
    });
    if (this.table.halted()) {
      this.finishTurn();
      return true;
    } else {
      return false;
    }
  }

  finishTurn() {
    if (this._winner === null && this.sunkBlack()) {
      this._winner = this._turn;
    }
    if (!this._keepTurn || this.sunkWhite()) {
      this._turn = 1 - this._turn;
    }
    if (!this._hitOwn) {
      this.sinkWhite();
    }
    this._guessedPocket = null;
    this._keepTurn = false;
    this._hitOwn = false;
  }

  sunkBlack() {
    return this.table.sunkBalls.some((b) => b.number === 8);
  }

  sunkWhite() {
    return this.table.sunkBalls.some((b) => b.number === 0);
  }

  sinkWhite() {
    if (!this.sunkWhite()) {
      this.table.liveBalls.splice(this.table.liveBalls.indexOf(this.table.whiteBall), 1);
      this.table.sunkBalls.push(this.table.whiteBall);
    }
  }

  upToLast() {
    return !this.liveBalls.some((b) => this.correctType(b));
  }

  correctType(ball) {
    if (ball.number === 8) {
      return this.upToLast();
    }
    return (sunk.ball.ballType() === this._firstPlayerType) === (this._turn === 0);
  }

  playerType() {
    if (this._firstPlayerType === null) {
      return null;
    }
    if (this._turn === 0) {
      return this._firstPlayerType;
    } else {
      return 1 - this._firstPlayerType;
    }
  }
}