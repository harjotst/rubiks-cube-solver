import json
from rubiks_cube import RubiksCube
from corners_pdb_generator import CornersPDBGenerator, CornerPositionOrientationMapGenerator

rubiks_cube = RubiksCube()

# cpomg = CornerPositionOrientationMapGenerator(rubiks_cube)

# m = cpomg.generate_map()

rubiks_cube.pretty_print()

corners_pdb_generator = CornersPDBGenerator(rubiks_cube)

corners_pdb_generator.generate_corners_pdb()
