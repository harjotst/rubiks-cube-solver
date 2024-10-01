from rubiks_cube import RubiksCube

class RubiksCubePatternKey:
    def __init__(self, rubiks_cube_information):
        self.information = rubiks_cube_information

    # create 40 bit key from corner positions and orientations 
    # each 5 bits in the key correspond to corner type (3 bits) and orientation (2 bits)
    def from_rubiks_cube_to_corners_key(self, rubiks_cube: RubiksCube):
        corner_key = 0
        for corner_position in range(8):
            corner_type = rubiks_cube.get_corner_type(corner_position)
            orientation = rubiks_cube.get_corner_orientation(corner_position)
            corner_key <<= 5
            corner_key |= ((orientation & 0b11) << 3) | (corner_type & 0b111)
        return corner_key

    # create 60 bit key from edge positions and orientations 
    # each 5 bits in the key correspond to edge type (4 bits) and orientation (1 bit)
    def from_rubiks_cube_to_all_edges_key(self, rubiks_cube: RubiksCube):
        all_edges_key = 0
        for edge_position in range(12):
            edge_type = rubiks_cube.get_edge_type(edge_position)
            orientation = rubiks_cube.get_edge_orientation(edge_position)
            all_edges_key <<= 5
            all_edges_key |= ((orientation & 0b1) << 4) | (edge_type & 0b1111)
        return all_edges_key

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

    # load edge type positions and orientations from 60 bit key
    def from_all_edges_key_to_rubiks_cube(self, edge_key):
        rubiks_cube = RubiksCube(self.information, False)
        for i in range(0, 60, 5):
            chunk = (edge_key >> (55 - i)) & 0b11111
            edge_position = int(i / 5)
            edge_type = chunk & 0b1111
            orientation = (chunk & 0b10000) >> 4
            rubiks_cube.set_edge_type(edge_position, edge_type, orientation)
        return rubiks_cube

    # create 60 bit key from edge positions and orientations 
    # each 5 bits in the key correspond to edge type (4 bits) and orientation (1 bit)
    def from_all_edges_key_to_edges_key(self, all_edges_key):
        edges_key = 0
        for i in range(0, 60, 5):
            chunk = (all_edges_key >> (55 - i)) & 0b11111
            edge_type = chunk & 0b1111
            edges_key <<= 4
            if edge_type <= 5:
                orientation = (chunk & 0b10000) >> 4
                edges_key |= ((orientation & 0b1) << 3) | (edge_type & 0b111)
            else:
                edges_key |= 6
        return edges_key
    
    # create 60 bit key from edge positions and orientations 
    # each 5 bits in the key correspond to edge type (4 bits) and orientation (1 bit)
    def from_all_edges_key_to_other_edges_key(self, all_edges_key):
        edges_key = 0
        for i in range(0, 60, 5):
            chunk = (all_edges_key >> (55 - i)) & 0b11111
            edge_type = chunk & 0b1111
            edges_key <<= 4
            if edge_type >= 6:
                orientation = (chunk & 0b10000) >> 4
                edges_key |= ((orientation & 0b1) << 3) | ((edge_type - 6) & 0b111)
            else:
                edges_key |= 6
        return edges_key

    def print_corner_key(self, key):
        for i in range(0, 40, 5):
            # extract 5 bits using bitwise shift and mask
            chunk = (key >> (35 - i)) & 0b11111
            # convert the 5-bit chunk to a binary string and print
            print(f"{chunk:05b}")
