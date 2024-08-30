import numpy as np
from rubiks_cube import RubiksCube
import json

class RubiksCubePatternKey:
    def __init__(self, key):
        self.key = key

    # load corner positions and orientations from 40 bit key
    # each 5 bits in the key correspond to corner type and orientation
    def from_corners_key_to_rubiks_cube(self, rubiks_cube: RubiksCube):
        rubiks_cube.faces = np.full((6, 3, 3), 6, dtype=np.uint8)
        key_copy = self.key
        for i in range(0, 40, 5):
            chunk = (key_copy >> (35 - i)) & 0b11111
            corner_position = int(i / 5)
            corner_type = chunk & 0b111
            orientation = (chunk & 0b11000) >> 3
            rubiks_cube.set_corner_type(corner_position, corner_type, orientation)

    def print_corner_key(self):
        key_copy = self.key
        for i in range(0, 40, 5):
            # Extract 5 bits using bitwise shift and mask
            chunk = (key_copy >> (35 - i)) & 0b11111
            
            # Convert the 5-bit chunk to a binary string and print
            print(f"{chunk:05b}")

