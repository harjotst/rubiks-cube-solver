import json

from corners_pdb_generator import CornersPDBGenerator
from edges_pdb_generator import EdgesPDBGenerator
from rubiks_cube import RubiksCube
from rubiks_cube_information import RubiksCubeInformation
from rubiks_cube_pattern_key import RubiksCubePatternKey

rubiks_cube_information = RubiksCubeInformation()

rb = RubiksCube(rubiks_cube_information)

rb.pretty_print()


# corners_pdb_generator = EdgesPDBGenerator(rubiks_cube_information)

# corners_pdb_generator.generate_edges_pdb()