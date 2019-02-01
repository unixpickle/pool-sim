"""
Action discretization.
"""

import math


class ActionDiscretizer:
    """
    A tool for converting between continuous and discrete
    actions.
    """

    def __init__(self):
        self.places = []
        self.angles = []
        y = 0.8
        while y <= 0.9:
            x = 0.1
            while x <= 0.4:
                self.places.append((x, y))
                x += 0.1
            y += 0.05
        for i in range(0, 64):
            self.angles.append((i - 32) * math.pi * 2 / 64)

    @property
    def num_angles(self):
        return len(self.angles)

    @property
    def num_scratch_angles(self):
        return len(self._scratch_angles())

    @property
    def num_places(self):
        return len(self.places)

    def discretize_angle(self, angle):
        closest = None
        dist = 10000
        for i, x in enumerate(self.angles):
            if abs(x - angle) < dist:
                dist = abs(x - angle)
                closest = i
        return closest

    def undiscretize_angle(self, disc):
        return self.angles[disc]

    def discretize_scratch_angle(self, angle):
        closest = None
        dist = 10000
        i = 0
        for i, x in enumerate(self._scratch_angles()):
            if abs(x - angle) < dist:
                dist = abs(x - angle)
                closest = i
        return closest

    def undiscretize_scratch_angle(self, disc):
        return self._scratch_angles()[disc]

    def discretize_place(self, x, y):
        closest = None
        dist = 10000
        for i, (x1, y1) in enumerate(self.places):
            d = abs(x - x1) + abs(y - y1)
            if d < dist:
                dist = d
                closest = i
        return closest

    def undiscretize_place(self, disc):
        return self.places[disc]

    def _scratch_angles(self):
        return [x for x in self.angles if x < 0]
