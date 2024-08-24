from enum import Enum

Colour = Enum('Colour', ['WHITE', 'BLUE', 'YELLOW', 'GREEN', 'ORANGE', 'RED'])
Move = Enum('Move', ['UP', 'DOWN', 'RIGHT', 'LEFT', 'FACE', 'BOTTOM', 'UP_PRIME', 'DOWN_PRIME', 'RIGHT_PRIME', 'LEFT_PRIME', 'FACE_PRIME', 'BOTTOM_PRIME'])

class RubiksCubeSolver:
    def __init__(self):
        self._assemble_rubiks_cube()

    # declare and initialize rubiks cube data structure
    def _assemble_rubiks_cube(self):
        self.rubiks_cube = []
        for colour in [Colour.WHITE, Colour.BLUE, Colour.YELLOW, Colour.GREEN, Colour.ORANGE, Colour.RED]:
            face = [[colour, colour, colour]] * 3
            self.rubiks_cube.append(face)

rubiks_cube_solver = RubiksCubeSolver()

print(rubiks_cube_solver.rubiks_cube)
