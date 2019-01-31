"""
A model for cloning a Pool agent.
"""

import torch
import torch.nn as nn

from data import BALL_VEC_SIZE


class Model(nn.Module):
    def __init__(self):
        self.ball_net = nn.Sequential(
            nn.Dense(BALL_VEC_SIZE, 512),
            nn.Tanh,
            nn.Dense(512, 512),
            nn.Tanh,
            nn.Dense(512, 256),
            nn.Tanh,
        )
        self.shoot_net = nn.Dense(256, 3)
        self.scratch_net = nn.Dense(256, 3)
        self.place_net = nn.Dense(256, 2)
        self.pick_net = nn.Dense(256, 6)

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
              shoot: a batch of (x, y, power).
              scratch: a batch of (x, y, power).
              place: a batch of (x, y).
              pick: a batch of logits with 6 options.
        """
        v = self.encode_states(states)
        return self.shoot(v), self.scratch(v), self.place(v), self.pick(v)

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
        return torch.cat(state_vecs)

    def shoot(self, state_vecs):
        params = self.shoot_net(state_vecs)
        return torch.cat([params[:, :2], torch.sigmoid(params[:, 2:])], dim=1)

    def scratch(self, state_vecs):
        params = self.scratch_net(state_vecs)
        return torch.cat([params[:, :1], -torch.exp(params[:, 1:2]),
                          torch.sigmoid(params[:, 2:])], dim=1)

    def place(self, state_vecs):
        params = self.place_net(state_vecs)
        x = torch.sigmoid(params[0]) * 0.5
        y = torch.sigmoid(params[1]) * 0.2 + 0.8
        return torch.stack([x, y], dim=1)

    def pick(self, state_vecs):
        return self.pick_net(state_vecs)
