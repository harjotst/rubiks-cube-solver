from rubiks_cube import RubiksCube
from rubiks_cube_information import RubiksCubeInformation
from rubiks_cube_pattern_key import RubiksCubePatternKey

from collections import deque

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
    def __init__(self, rubiks_cube_information: RubiksCubeInformation):
        self.information = rubiks_cube_information
        self.pattern_key = RubiksCubePatternKey(self.information)
        self.bfs = deque([])
        self.seen = set()

        self._initialize_solved_bfs_and_seen()

        self.moves = ['U', 'D', 'R', 'L', 'F', 'B', 'U\'', 'D\'', 'R\'', 'L\'', 'F\'', 'B\'', 'U2', 'D2', 'R2', 'L2', 'F2', 'B2']

    def _initialize_solved_bfs_and_seen(self):
        rubiks_cube = RubiksCube(self.information)

        for i in range(4):
            for _ in range(i):
                rubiks_cube.make_move('x')
            for j in range(4):
                for _ in range(j):
                    rubiks_cube.make_move('y')
                for k in range(4):
                    for _ in range(k):
                        rubiks_cube.make_move('z')
                    pattern_key = self.pattern_key.from_rubiks_cube_to_corners_key(rubiks_cube)
                    if pattern_key not in self.seen:
                        self.seen.add(pattern_key)
                        self.bfs.appendleft((pattern_key, None, 0))
                    for _ in range(k):
                        rubiks_cube.undo_last_move()
                for _ in range(j):
                    rubiks_cube.undo_last_move()
            for _ in range(i):
                rubiks_cube.undo_last_move()

    def _get_legal_moves(self, previous_move=None):
        if previous_move:
            return list(filter(lambda move: not move.startswith(previous_move[0]), self.moves))
        return self.moves

    def generate_corners_pdb(self):
        while self.bfs:
            corner_permutation_key, last_move, number_of_moves_before = self.bfs.pop()
            print(corner_permutation_key, number_of_moves_before)
            corner_permutation_rubiks_cube = self.pattern_key.from_corners_key_to_rubiks_cube(corner_permutation_key)
            legal_moves = self._get_legal_moves(last_move)

            for legal_move in legal_moves:
                corner_permutation_rubiks_cube.make_move(legal_move)

                corner_permutation_corners_key = self.pattern_key.from_rubiks_cube_to_corners_key(corner_permutation_rubiks_cube)
                if corner_permutation_corners_key not in self.seen:
                    self.seen.add(corner_permutation_corners_key)
                    self.bfs.appendleft((corner_permutation_corners_key, legal_move, number_of_moves_before + 1))

                corner_permutation_rubiks_cube.undo_last_move()
