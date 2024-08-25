from enum import Enum

Move = Enum('Move', ['U', 'U\''])

class RubiksCube:
    def __init__(self):
        self._assemble_rubiks_cube()

    # declare and initialize rubiks cube data structure
    def _assemble_rubiks_cube(self):
        self.rubiks_cube = []
        for colour in ['🟧', '🟦', '🟥', '🟩', '🟨', '⬜️']:
            face = [[colour, colour, colour]] * 3
            self.rubiks_cube.append(face)

    # pretty print the rubiks cube
    def pretty_print(self):
        rc = self.rubiks_cube
        print('       ########')
        print(f"       #{rc[4][0][0]}{rc[4][0][1]}{rc[4][0][2]}#")
        print(f"       #{rc[4][1][0]}{rc[4][1][1]}{rc[4][1][2]}#")
        print(f"       #{rc[4][2][0]}{rc[4][2][1]}{rc[4][2][2]}#")
        print('#' * 29)
        print(f"#{rc[0][0][0]}{rc[0][0][1]}{rc[0][0][2]}#{rc[1][0][0]}{rc[1][0][1]}{rc[1][0][2]}#{rc[2][0][0]}{rc[2][0][1]}{rc[2][0][2]}#{rc[3][0][0]}{rc[3][0][1]}{rc[3][0][2]}#")
        print(f"#{rc[0][1][0]}{rc[0][1][1]}{rc[0][1][2]}#{rc[1][1][0]}{rc[1][1][1]}{rc[1][1][2]}#{rc[2][1][0]}{rc[2][1][1]}{rc[2][1][2]}#{rc[3][1][0]}{rc[3][1][1]}{rc[3][1][2]}#")
        print(f"#{rc[0][2][0]}{rc[0][2][1]}{rc[0][2][2]}#{rc[1][2][0]}{rc[1][2][1]}{rc[1][2][2]}#{rc[2][2][0]}{rc[2][2][1]}{rc[2][2][2]}#{rc[3][2][0]}{rc[3][2][1]}{rc[3][2][2]}#")
        print('#' * 29)
        print(f"       #{rc[5][0][0]}{rc[5][0][1]}{rc[5][0][2]}#")
        print(f"       #{rc[5][1][0]}{rc[5][1][1]}{rc[5][1][2]}#")
        print(f"       #{rc[5][2][0]}{rc[5][2][1]}{rc[5][2][2]}#")
        print('       ########')

rubiks_cube = RubiksCube()

rubiks_cube.pretty_print()
