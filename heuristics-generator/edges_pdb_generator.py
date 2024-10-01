from rubiks_cube import RubiksCube
from rubiks_cube_information import RubiksCubeInformation
from rubiks_cube_pattern_key import RubiksCubePatternKey

from collections import deque

class EdgePositionOrientationMapGenerator:
    def __init__(self, rubiks_cube_information: RubiksCubeInformation):
        self.information = rubiks_cube_information
        self.solved = RubiksCube(self.information)

    def _get_edge_cubie_colours(self, edge_indices):
        rc = self.solved.faces
        edge_one, edge_two = edge_indices
        return [int(rc[edge_one[0],edge_one[1],edge_one[2]]), int(rc[edge_two[0],edge_two[1],edge_two[2]])]

    def _get_all_cubie_orientations(self, cubie_colours: list):
        cc = cubie_colours
        cycle_one = [cc[1], cc[0]]
        return [cc, cycle_one]

    def generate_map(self):
        edges_dict = dict()

        for _ in range(4):
            for _ in range(4):
                for _ in range(4):
                    for edge_position, edge_indices in self.information.edge_positions_to_indices.items():
                        edge_cubie = self._get_edge_cubie_colours(edge_indices)
                        edge_type = self.solved.get_edge_type(edge_position)
                        edge_orientations = self._get_all_cubie_orientations(edge_cubie)
                        if f'{edge_type}' not in edges_dict:
                            edges_dict[f'{edge_type}'] = {}
                        if f'{edge_position}' not in edges_dict[f'{edge_type}']:
                            edges_dict[f'{edge_type}'][f'{edge_position}'] = []
                        edges_dict[f'{edge_type}'][f'{edge_position}'] = edge_orientations
                    self.solved.pretty_print()
                    self.solved.make_move('x')
                self.solved.make_move('y')
            self.solved.make_move('z')

        return edges_dict

class EdgesPDBGenerator:
    def __init__(self, rubiks_cube_information: RubiksCubeInformation):
        self.information = rubiks_cube_information
        self.pattern_key = RubiksCubePatternKey(self.information)
        self.bfs = deque([])
        self.seen = set()

        self._initialize_solved_bfs_and_seen()

        self.moves = ['U', 'D', 'R', 'L', 'F', 'B', 'U\'', 'D\'', 'R\'', 'L\'', 'F\'', 'B\'', 'U2', 'D2', 'R2', 'L2', 'F2', 'B2']

    def _initialize_solved_bfs_and_seen(self):
        rubiks_cube = RubiksCube(self.information)

        all_edges_pattern_key = self.pattern_key.from_rubiks_cube_to_all_edges_key(rubiks_cube)
        edges_pattern_key = self.pattern_key.from_all_edges_key_to_edges_key(all_edges_pattern_key)

        self.seen.add(edges_pattern_key)
        self.bfs.appendleft((all_edges_pattern_key, None, 0))

    def _get_legal_moves(self, previous_move=None):
        if previous_move:
            return list(filter(lambda move: not move.startswith(previous_move[0]), self.moves))
        return self.moves
    
    def generate_edges_pdb(self):
        while self.bfs:
            edge_permutation_key, last_move, number_of_moves_before = self.bfs.pop()
            print(edge_permutation_key, number_of_moves_before)
            edge_permutation_rubiks_cube = self.pattern_key.from_all_edges_key_to_rubiks_cube(edge_permutation_key)
            legal_moves = self._get_legal_moves(last_move)

            for legal_move in legal_moves:
                edge_permutation_rubiks_cube.make_move(legal_move)
                all_edges_key = self.pattern_key.from_rubiks_cube_to_all_edges_key(edge_permutation_rubiks_cube)
                edges_key = self.pattern_key.from_all_edges_key_to_edges_key(all_edges_key)
                if edges_key not in self.seen:
                    self.seen.add(edges_key)
                    self.bfs.appendleft((all_edges_key, legal_move, number_of_moves_before + 1))

                edge_permutation_rubiks_cube.undo_last_move()
