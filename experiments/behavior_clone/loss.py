"""
Loss functions for behavior cloning.
"""

import math

import numpy as np
import torch
import torch.nn.functional as F


def mean_loss(model_out, actions):
    """
    Compute the loss of the model given the actual actions
    that were taken. Irrelevant heads are not used.
    """
    shoot, scratch, place, pick = model_out
    total = 0
    for i, action in enumerate(actions):
        if action['type'] == 'ShootAction':
            total += shoot_loss(shoot[i], action)
        elif action['type'] == 'ShootScratchAction':
            total += shoot_loss(scratch[i], action)
        elif action['type'] == 'PlaceAction':
            total += place_loss(place[i], action)
        elif action['type'] == 'PickPocketAction':
            total += pick_loss(pick[i], action)
    return total / len(actions)


def shoot_loss(shoot_vec, action):
    actionX = math.cos(action['angle'])
    actionY = math.sin(action['angle'])
    action_vec = torch.from_numpy(np.array([actionX, actionY])).to(shoot_vec.device)
    norm = torch.sqrt(torch.sum(torch.square(shoot_vec[:2])))
    dot_loss = 1 - torch.sum(action_vec * shoot_vec[:2]) / norm
    power_loss = torch.square(shoot_vec[2] - action['power'])
    return dot_loss + power_loss


def place_loss(place_vec, action):
    action_vec = torch.from_numpy(np.array([action['x'], action['y']]))
    return torch.sum(torch.square(place_vec - action_vec))


def pick_loss(pick_vec, action):
    probs = F.log_softmax(pick_vec)
    return -probs[action['index']]
