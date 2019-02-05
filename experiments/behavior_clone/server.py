"""
A small web server to provide the neural network as an API
to JS scripts.
"""

import argparse
import json

from flask import Flask, request
import numpy as np
import torch

from data import ball_vector
from discretize import ActionDiscretizer
from model import Model

app = Flask(__name__)


@app.route('/turn', methods=['POST'])
def turn():
    balls = request.get_json()
    model = app.config['model']
    ball_vecs = np.array([ball_vector(b) for b in balls], dtype=np.float32)
    torch_vecs = torch.from_numpy(ball_vecs)
    shoot, scratch, place, pick = model([torch_vecs])

    shoot_max = torch.argmax(shoot[0]).item()
    scratch_max = torch.argmax(scratch[0]).item()
    place_max = torch.argmax(place[0]).item()
    pick_max = torch.argmax(pick[0]).item()

    disc = ActionDiscretizer()
    place_x, place_y = disc.undiscretize_place(place_max)
    return json.dumps({
        'ShootAction': {
            'type': 'ShootAction',
            'angle': disc.undiscretize_angle(shoot_max),
            'power': 1,
        },
        'ShootScratchAction': {
            'type': 'ShootScratchAction',
            'angle': disc.undiscretize_scratch_angle(scratch_max),
            'power': 1,
        },
        'PlaceAction': {
            'type': 'PlaceAction',
            'x': place_x,
            'y': place_y,
        },
        'PickPocketAction': {
            'type': 'PickPocketAction',
            'index': pick_max,
        },
    })


def main():
    parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('--path', help='path to model to load', default='model.pt')
    args = parser.parse_args()

    state_dict = torch.load(args.path, map_location='cpu')

    app.config['model'] = Model()
    app.config['model'].load_state_dict(state_dict)
    app.run()


if __name__ == '__main__':
    main()
