"""
A model for cloning a Pool agent.
"""

import torch
import torch.nn as nn

from data import BALL_VEC_SIZE
from discretize import ActionDiscretizer

NUM_POCKETS = 6


class Model(nn.Module):
    def __init__(self):
        super().__init__()
        self.ball_net = nn.Sequential(
            nn.Linear(BALL_VEC_SIZE, 512),
            nn.Tanh(),
            nn.Linear(512, 512),
            nn.Tanh(),
            nn.Linear(512, 256),
            nn.Tanh(),
        )
        disc = ActionDiscretizer()
        self.shoot_net = nn.Linear(256, disc.num_angles)
        self.scratch_net = nn.Linear(256, disc.num_scratch_angles)
        self.place_net = nn.Linear(256, disc.num_places)
        self.pick_net = nn.Linear(256, NUM_POCKETS)

    def forward(self, states):
        """
        Apply the behavior cloning model to a batch of
        game states.

        Args:
            states: a sequence of states, where each state
              is itself a batch of ball vectors. Different
              states may contain different numbers of ball
              vectors.

        Returns:
            A tuple (shoot, scratch, place, pick):
              shoot: a batch of angle logits.
              scratch: a batch of scratch angle logits.
              place: a batch of placement logits.
              pick: a batch of pocket logits.
        """
        v = self.encode_states(states)
        return self.shoot_net(v), self.scratch_net(v), self.place_net(v), self.pick_net(v)

    def encode_states(self, states):
        """
        Get a state vector for each state.

        See forward() for details on the incoming state
        representation.
        """
        ball_vecs = self.ball_net(torch.cat(states))
        state_vecs = []
        idx = 0
        for state in states:
            state_balls = ball_vecs[idx:idx + state.shape[0]]
            state_vecs.append(torch.max(state_balls, 0)[0])
            idx += state.shape[0]
        return torch.stack(state_vecs)
