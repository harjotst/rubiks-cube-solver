from corners_pdb_generator import CornersPDBGenerator
from rubiks_cube_pattern_key import RubiksCubePatternKey
from rubiks_cube import RubiksCube
from rubiks_cube_information import RubiksCubeInformation

rubiks_cube_information = RubiksCubeInformation()

rubiks_cube = RubiksCube(rubiks_cube_information)

# rubiks_cube.set_corner_type(1, 2, 2)

rubiks_cube.make_move('L')
# rubiks_cube.make_move('L2')
# rubiks_cube.make_move('R2')
# rubiks_cube.make_move('U2')
# rubiks_cube.make_move('D2')
# rubiks_cube.make_move('F2')
# rubiks_cube.make_move('B2')
rubiks_cube.pretty_print()

# for i in range(8):
#     print(rubiks_cube.get_corner_type(i))

# cpomg = CornerPositionOrientationMapGenerator(rubiks_cube)

# m = cpomg.generate_map()

corners_pdb_generator = CornersPDBGenerator(target=rubiks_cube, rubiks_cube_information=rubiks_cube_information)

key = corners_pdb_generator.generate_corners_pdb()

rubiks_cube_pattern_key = RubiksCubePatternKey(key)

rubiks_cube_pattern_key.print_corner_key()

rubiks_cube_pattern_key.from_corners_key_to_rubiks_cube(rubiks_cube)

rubiks_cube.pretty_print()

# keys_to_rubiks_cube.from_corners_key(key)

# rubiks_cube.pretty_print()