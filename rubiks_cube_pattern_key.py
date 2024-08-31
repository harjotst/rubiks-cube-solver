from rubiks_cube import RubiksCube

class RubiksCubePatternKey:
    def __init__(self, rubiks_cube_information):
        self.information = rubiks_cube_information

    def is_corner_key_solved(self, corner_key):
        
        pass

    # create 40 bit key from corner positions and orientations 
    # each 5 bits in the key correspond to corner type and orientation
    def from_rubiks_cube_to_corners_key(self, rubiks_cube: RubiksCube):
        corner_key = 0
        for corner_position in range(8):
            corner_type = rubiks_cube.get_corner_type(corner_position)
            orientation = rubiks_cube.get_corner_orientation(corner_position)
            corner_key <<= 5
            corner_key |= ((orientation & 0b11) << 3) | (corner_type & 0b111)
        return corner_key

    # load corner type positions and orientations from 40 bit key
    def from_corners_key_to_rubiks_cube(self, corner_key):
        rubiks_cube = RubiksCube(self.information, False)
        for i in range(0, 40, 5):
            chunk = (corner_key >> (35 - i)) & 0b11111
            corner_position = int(i / 5)
            corner_type = chunk & 0b111
            orientation = (chunk & 0b11000) >> 3
            rubiks_cube.set_corner_type(corner_position, corner_type, orientation)
        return rubiks_cube

    def print_corner_key(self, key):
        for i in range(0, 40, 5):
            # extract 5 bits using bitwise shift and mask
            chunk = (key >> (35 - i)) & 0b11111
            # convert the 5-bit chunk to a binary string and print
            print(f"{chunk:05b}")
