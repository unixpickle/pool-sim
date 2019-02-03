"""
Loss functions for behavior cloning.
"""

import torch.nn.functional as F

from discretize import ActionDiscretizer


def clone_loss(model_out, actions):
    """
    Compute the loss of the model given the actual actions
    that were taken. Irrelevant heads are not used.
    """
    disc = ActionDiscretizer()
    shoot, scratch, place, pick = model_out
    total = 0
    for i, action in enumerate(actions):
        if action['type'] == 'ShootAction':
            total += discrete_loss(shoot[i], disc.discretize_angle(action['angle']))
        elif action['type'] == 'ShootScratchAction':
            total += discrete_loss(scratch[i], disc.discretize_scratch_angle(action['angle']))
        elif action['type'] == 'PlaceAction':
            total += discrete_loss(place[i], disc.discretize_place(action['x'], action['y']))
        elif action['type'] == 'PickPocketAction':
            total += discrete_loss(pick[i], action['index'])
    return total / len(actions)


def discrete_loss(logits, choice):
    probs = F.log_softmax(logits, dim=-1)
    return -probs[choice]
