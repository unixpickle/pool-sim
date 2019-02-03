// Physics simulator adapted to 2D from:
// https://github.com/unixpickle/learn-gfx/blob/fd17c2a5e5e3439993a3d54fd1c9230a5cfb8e37/src/physics.js

// An abstract particle class with a physics state.
class Particle {
  constructor(x, y, vx, vy) {
    this.x = x || 0;
    this.y = y || 0;
    this.vx = vx || 0;
    this.vy = vy || 0;
  }

  energy() {
    return Math.pow(this.vx, 2) + Math.pow(this.vy, 2);
  }

  distance(p1) {
    return Math.sqrt(Math.pow(this.x - p1.x, 2) + Math.pow(this.y - p1.y, 2));
  }
}

// An abstract base class for something which computes the
// force on every particle in a particle system.
class ForceField {
  // Compute the forces on each particle.
  // The result is an array of arrays, where each inner
  // array is of the form [x, y].
  forces(particles) {
    throw new Error('not implemented');
  }
}

// A large vector of positions and velocities for every
// particle in a system. Can also be used to represent the
// derivatives of said values.
class PhysicsVector {
  constructor(positions, velocities) {
    this.positions = positions;
    this.velocities = velocities;
  }

  static fromParticles(particles) {
    const positions = [];
    const velocities = [];
    particles.forEach((p) => {
      positions.push([p.x, p.y]);
      velocities.push([p.vx, p.vy]);
    });
    return new PhysicsVector(positions, velocities);
  }

  static fromDerivative(particles, field) {
    const positions = particles.map((p) => [p.vx, p.vy]);
    const forces = field.forces(particles);
    return new PhysicsVector(positions, forces);
  }

  copy() {
    const positions = this.positions.map((p) => [p[0], p[1]]);
    const velocities = this.velocities.map((v) => [v[0], v[1]]);
    return new PhysicsVector(positions, velocities);
  }

  scale(x) {
    this.positions.forEach((p) => {
      p[0] *= x;
      p[1] *= x;
    });
    this.velocities.forEach((v) => {
      v[0] *= x;
      v[1] *= x;
    });
    return this;
  }

  addTo(particles) {
    particles.forEach((p, i) => {
      const pos = this.positions[i];
      p.x += pos[0];
      p.y += pos[1];
      const vel = this.velocities[i];
      p.vx += vel[0];
      p.vy += vel[1];
    });
  }

  copyTo(particles) {
    particles.forEach((p, i) => {
      const pos = this.positions[i];
      p.x = pos[0];
      p.y = pos[1];
      const vel = this.velocities[i];
      p.vx = vel[0];
      p.vy = vel[1];
    });
  }
}

// Perform a step of Euler's method on the system.
function eulerStep(particles, field, dt) {
  const delta = PhysicsVector.fromDerivative(particles, field);
  delta.scale(dt);
  delta.addTo(particles);
}

// Perform a step of the RK4 method on the system.
function rk4Step(particles, field, dt) {
  const k1 = PhysicsVector.fromDerivative(particles, field).scale(dt);
  const k2 = withBackup(particles, () => {
    k1.copy().scale(0.5).addTo(particles);
    return PhysicsVector.fromDerivative(particles, field).scale(dt);
  });
  const k3 = withBackup(particles, () => {
    k2.copy().scale(0.5).addTo(particles);
    return PhysicsVector.fromDerivative(particles, field).scale(dt);
  })
  const k4 = withBackup(particles, () => {
    k3.addTo(particles);
    return PhysicsVector.fromDerivative(particles, field).scale(dt);
  })
  k1.scale(1 / 6).addTo(particles);
  k2.scale(2 / 6).addTo(particles);
  k3.scale(2 / 6).addTo(particles);
  k4.scale(1 / 6).addTo(particles);
}

function withBackup(particles, f) {
  const backup = PhysicsVector.fromParticles(particles);
  const res = f();
  backup.copyTo(particles);
  return res;
}
