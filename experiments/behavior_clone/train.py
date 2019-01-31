"""
Train a behavior cloning model.
"""

import argparse

import torch
import torch.optim as optim

from data import load_data
from loss import clone_loss
from model import Model


def main():
    args = arg_parser().parse_args()

    device = torch.device(args.device)

    model = Model()
    model.to(device)

    optimizer = optim.Adam(model.parameters(), lr=args.lr)

    train_data = load_data(args.train, args.batch, device)
    test_data = load_data(args.test, args.batch, device)

    for (train_samples, train_actions), (test_samples, test_actions) in zip(train_data, test_data):
        train_out = model(train_samples)
        test_out = model(test_samples)
        train_loss = clone_loss(train_out, train_actions)
        test_loss = clone_loss(test_out, test_actions)

        optimizer.zero_grad()
        train_loss.backward()
        optimizer.step()

        print('test_loss=%f train_loss=%f' % (test_loss.item(), train_loss.item()))


def arg_parser():
    parser = argparse.ArgumentParser(formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument('--path', help='path to save model', default='model.pt')
    parser.add_argument('--lr', help='Adam learning rate', default=0.001, type=float)
    parser.add_argument('--batch', help='SGD batch size', default=16, type=int)
    parser.add_argument('--device', help='Torch device', default='cpu')
    parser.add_argument('train', help='training data path')
    parser.add_argument('test', help='testing data path')
    return parser


if __name__ == '__main__':
    main()
