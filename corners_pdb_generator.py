from rubiks_cube import RubiksCube
from collections import deque

import json

from rubiks_cube_information import RubiksCubeInformation

class CornerPositionOrientationMapGenerator:
    def __init__(self, solved_rubiks_cube: RubiksCube):
        self.solved = solved_rubiks_cube
        
        self.corner_indices = [
            [[0, 0, 2], [1, 0, 0], [4, 2, 0]],
            [[1, 0, 2], [2, 0, 0], [4, 2, 2]],
            [[0, 2, 2], [1, 2, 0], [5, 0, 0]],
            [[1, 2, 2], [2, 2, 0], [5, 0, 2]],
            [[0, 0, 0], [3, 0, 2], [4, 0, 0]],
            [[2, 0, 2], [3, 0, 0], [4, 0, 2]],
            [[0, 2, 0], [3, 2, 2], [5, 2, 0]],
            [[2, 2, 2], [3, 2, 0], [5, 2, 2]]
        ]

    def _get_cubie_index_colours(self, index):
        rc = self.solved.faces
        t1, t2, t3 = index
        return [rc[t1[0]][t1[1]][t1[2]], rc[t2[0]][t2[1]][t2[2]], rc[t3[0]][t3[1]][t3[2]]]
    
    def _get_all_cubie_orientations(self, cubie_colours: list):
        cc = cubie_colours
        cycle_one = [cc[1], cc[2], cc[0]]
        cycle_two = [cc[2], cc[0], cc[1]]
        return [cc, cycle_one, cycle_two]
    
    def _determine_corner(self, corner):
        sorted_corner = sorted(corner)
        if sorted_corner == [0, 1, 4]:
            return 0
        elif sorted_corner == [1, 2, 4]:
            return 1
        elif sorted_corner == [0, 1, 5]:
            return 2
        elif sorted_corner == [1, 2, 5]:
            return 3
        elif sorted_corner == [0, 3, 4]:
            return 4
        elif sorted_corner == [2, 3, 4]:
            return 5
        elif sorted_corner == [0, 3, 5]:
            return 6
        elif sorted_corner == [2, 3, 5]:
            return 7
    
    def _determine_corner_position(self, index):
        for i, corner_index in enumerate(self.corner_indices):
            if corner_index == index:
                return i

    def generate_map(self):
        corners_dict = {}

        for _ in range(2):
            for _ in range(4):
                for index in self.corner_indices:
                    corner_cubie = self._get_cubie_index_colours(index)
                    corner_type = self._determine_corner(corner_cubie)
                    corner_orientations = self._get_all_cubie_orientations(corner_cubie)
                    corner_position = self._determine_corner_position(index)
                    if corner_type not in corners_dict:
                        corners_dict[corner_type] = {}
                    if corner_position not in corners_dict[corner_type]:
                        corners_dict[corner_type][corner_position] = []
                    corners_dict[corner_type][corner_position] = corner_orientations
                self.solved.make_move('x')
            self.solved.make_move('y2')

        return corners_dict

class CornersPDBGenerator:
    def __init__(self, target: RubiksCube, rubiks_cube_information: RubiksCubeInformation):
        self.goal = target
        self.information = rubiks_cube_information

    def _get_corners(self):
        rb = self.goal.faces
        corners = []
        corners.append([rb[0][0][2], rb[1][0][0], rb[4][2][0]])
        corners.append([rb[1][0][2], rb[2][0][0], rb[4][2][2]])
        corners.append([rb[0][2][2], rb[1][2][0], rb[5][0][0]])
        corners.append([rb[1][2][2], rb[2][2][0], rb[5][0][2]])
        corners.append([rb[0][0][0], rb[3][0][2], rb[4][0][0]])
        corners.append([rb[2][0][2], rb[3][0][0], rb[4][0][2]])
        corners.append([rb[0][2][0], rb[3][2][2], rb[5][2][0]])
        corners.append([rb[2][2][2], rb[3][2][0], rb[5][2][2]])
        return corners

    def _determine_corner(self, sorted_corner):
        if sorted_corner == [0, 1, 4]:
            return 0
        elif sorted_corner == [1, 2, 4]:
            return 1
        elif sorted_corner == [0, 1, 5]:
            return 2
        elif sorted_corner == [1, 2, 5]:
            return 3
        elif sorted_corner == [0, 3, 4]:
            return 4
        elif sorted_corner == [2, 3, 4]:
            return 5
        elif sorted_corner == [0, 3, 5]:
            return 6
        elif sorted_corner == [2, 3, 5]:
            return 7

    def _determine_orientation(self, corner_type, position, corner):
        for i, corner_orientation in enumerate(self.information.corner_orientations[f'{corner_type}'][f'{position}']):
            if corner == corner_orientation:
                return i

    def _convert_corners_to_key(self):
        key = 0
        corners = self._get_corners()
        for i, corner in enumerate(corners):
            sorted_corner = sorted(corner)
            corner_type = self._determine_corner(sorted_corner)
            orientation = self._determine_orientation(corner_type, i, corner)
            key <<= 5
            key |= ((orientation & 0b11) << 3) | (corner_type & 0b111)
        return key

    def generate_corners_pdb(self):
        key = self._convert_corners_to_key()

        return key
