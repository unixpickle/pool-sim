"""
Loading behavior cloning data.
"""

import json

import numpy as np
import torch

BALL_VEC_SIZE = 18


def load_data(path, batch_size, device):
    """
    Repeatedly read and process the data-points.

    Args:
        path: a JSON data file.
        batch_size: the number of samples per yield.
        device: the torch device.

    Returns:
        An iterator over (samples, actions) tuples.
    """
    batch_samples = []
    batch_actions = []
    while True:
        for datum in load_raw_data(path):
            sample_vecs = np.array([ball_vector(b) for b in datum['live']], dtype=np.float32)
            batch_samples.append(torch.from_numpy(sample_vecs).to(device))
            batch_actions.append(datum['action'])
            if len(batch_samples) == batch_size:
                yield batch_samples, batch_actions
                batch_samples = []
                batch_actions = []


def load_raw_data(path):
    """
    Read the data from the data path.

    Returns:
        An iterator over dict objects where each object
          is a data-point.
    """
    with open(path, 'rt') as in_path:
        doc = in_path.readline().rstrip()
        if doc == '':
            return
        yield json.loads(doc)


def ball_vector(ball):
    """
    Convert a ball object to a numpy array.
    """
    res = [0.0] * 18
    res[ball['number']] = 1.0
    res[-2] = ball['x']
    res[-1] = ball['y']
    return np.array(res, dtype=np.float32)
