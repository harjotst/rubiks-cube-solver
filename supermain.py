import json

from corners_pdb_generator import CornersPDBGenerator
from rubiks_cube_pattern_key import RubiksCubePatternKey
from rubiks_cube import RubiksCube
from rubiks_cube_information import RubiksCubeInformation

rubiks_cube_information = RubiksCubeInformation()

rubiks_cube = RubiksCube(rubiks_cube_information)

rubiks_cube_pattern_key = RubiksCubePatternKey(rubiks_cube_information)

# rubiks_cube_pattern_key.from_corners_key_to_rubiks_cube(34532047215).pretty_print()

corners_pdb_generator = CornersPDBGenerator(rubiks_cube_information)

corners_pdb_generator.generate_corners_pdb()