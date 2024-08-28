from rubiks_cube import RubiksCube
from corners_pdb_generator import CornersPDBGenerator

rubiks_cube = RubiksCube()

rubiks_cube.pretty_print()

corners_pdb_generator = CornersPDBGenerator(rubiks_cube)

corners_pdb_generator.generate_corners_pdb()

# rubiks_cube.make_move('R')