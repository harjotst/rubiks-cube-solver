import json

from edges_pdb_generator import EdgesPDBGenerator
from rubiks_cube import RubiksCube
from rubiks_cube_information import RubiksCubeInformation

rubiks_cube_information = RubiksCubeInformation()

# rubiks_cube = RubiksCube(rubiks_cube_information)

# rubiks_cube.pretty_print()

# rubiks_cube.make_move('z')

# rubiks_cube.pretty_print()

edges_pdb_generator = EdgesPDBGenerator(rubiks_cube_information)

edges_pdb_generator.generate_edges_pdb()

# something = EdgePositionOrientationMapGenerator(rubiks_cube_information)

# print(json.dumps(something.generate_map(), indent=2))