class RubiksCube:
    def __init__(self):
        self._assemble_rubiks_cube()

    # declare and initialize rubiks cube data structure
    def _assemble_rubiks_cube(self):
        self.rubiks_cube = []
        for i, colour in enumerate(['🟧', '🟦', '🟥', '🟩', '🟨', '⬜️']):
        # for colour in [0, 1, 2, 3, 4, 5]:
            face = [[[colour, i] for _ in range(3)] for _ in range(3)]
            self.rubiks_cube.append(face)

    # pretty print the rubiks cube
    def pretty_print(self):
        rc = self.rubiks_cube
        print('       ########')
        print(f"       #{rc[4][0][0][0]}{rc[4][0][1][0]}{rc[4][0][2][0]}#")
        print(f"       #{rc[4][1][0][0]}{rc[4][1][1][0]}{rc[4][1][2][0]}#")
        print(f"       #{rc[4][2][0][0]}{rc[4][2][1][0]}{rc[4][2][2][0]}#")
        print('#' * 29)
        print(f"#{rc[0][0][0][0]}{rc[0][0][1][0]}{rc[0][0][2][0]}#{rc[1][0][0][0]}{rc[1][0][1][0]}{rc[1][0][2][0]}#{rc[2][0][0][0]}{rc[2][0][1][0]}{rc[2][0][2][0]}#{rc[3][0][0][0]}{rc[3][0][1][0]}{rc[3][0][2][0]}#")
        print(f"#{rc[0][1][0][0]}{rc[0][1][1][0]}{rc[0][1][2][0]}#{rc[1][1][0][0]}{rc[1][1][1][0]}{rc[1][1][2][0]}#{rc[2][1][0][0]}{rc[2][1][1][0]}{rc[2][1][2][0]}#{rc[3][1][0][0]}{rc[3][1][1][0]}{rc[3][1][2][0]}#")
        print(f"#{rc[0][2][0][0]}{rc[0][2][1][0]}{rc[0][2][2][0]}#{rc[1][2][0][0]}{rc[1][2][1][0]}{rc[1][2][2][0]}#{rc[2][2][0][0]}{rc[2][2][1][0]}{rc[2][2][2][0]}#{rc[3][2][0][0]}{rc[3][2][1][0]}{rc[3][2][2][0]}#")
        print('#' * 29)
        print(f"       #{rc[5][0][0][0]}{rc[5][0][1][0]}{rc[5][0][2][0]}#")
        print(f"       #{rc[5][1][0][0]}{rc[5][1][1][0]}{rc[5][1][2][0]}#")
        print(f"       #{rc[5][2][0][0]}{rc[5][2][1][0]}{rc[5][2][2][0]}#")
        print('       ########')

    # rotate a face clockwise or anti-clockwise. "clockwise" from the perspective of that face "facing" you.
    def _rotate_face(self, face, clockwise=True, times=1):
        for _ in range(times):
            f, rc = face, self.rubiks_cube
            if clockwise:
                rc[f][0][0], rc[f][0][2], rc[f][2][2], rc[f][2][0] = rc[f][2][0], rc[f][0][0], rc[f][0][2], rc[f][2][2]
                rc[f][1][2], rc[f][2][1], rc[f][1][0], rc[f][0][1] = rc[f][0][1], rc[f][1][2], rc[f][2][1], rc[f][1][0]
            else:
                rc[f][2][0], rc[f][0][0], rc[f][0][2], rc[f][2][2] = rc[f][0][0], rc[f][0][2], rc[f][2][2], rc[f][2][0]
                rc[f][0][1], rc[f][1][2], rc[f][2][1], rc[f][1][0] = rc[f][1][2], rc[f][2][1], rc[f][1][0], rc[f][0][1]

    # turn a row clockwise or anti-clockwise
    def _rotate_row(self, row, left=True, times=1):
        for _ in range(times):
            r, rc = row, self.rubiks_cube
            if left:
                rc[0][r], rc[1][r], rc[2][r], rc[3][r] = rc[1][r], rc[2][r], rc[3][r], rc[0][r]
            else:
                rc[1][r], rc[2][r], rc[3][r], rc[0][r] = rc[0][r], rc[1][r], rc[2][r], rc[3][r]

    # turn a column clockwise or anti-clockwise
    def _rotate_column(self, column, down=True, times=1):
        for _ in range(times):
            c, rc = column, self.rubiks_cube
            oc = 1 if c == 1 else 2 if c == 0 else 0
            if down:
                for r in range(3):
                    rc[1][r][c], rc[5][r][c], rc[3][2 - r][oc], rc[4][r][c] = rc[4][r][c], rc[1][r][c], rc[5][r][c], rc[3][2 - r][oc]
            else:
                for r in range(3):
                    rc[4][r][c], rc[1][r][c], rc[5][r][c], rc[3][2 - r][oc] = rc[1][r][c], rc[5][r][c], rc[3][2 - r][oc], rc[4][r][c]

    # returns left column, top row, right column, and bottom row indices for layer
    def _translate_layer_to_columns_and_rows(self, layer):
        if layer == 0:
            return 2, 2, 0, 0
        elif layer == 1:
            return 1, 1, 1, 1
        else:
            return 0, 0, 2, 2

    # turn a layer clockwise or anti-clockwise
    def _rotate_layer(self, layer, clockwise=True, times=1):
        for _ in range(times):
            rc = self.rubiks_cube
            l_col, t_row, r_col, b_row = self._translate_layer_to_columns_and_rows(layer)
            left_layer = [r[l_col] for r in rc[0]]
            top_layer = list(rc[4][t_row])
            right_layer = [r[r_col] for r in rc[2]]
            bottom_layer = list(rc[5][b_row])
            if clockwise:
                for r in range(3):
                    rc[0][r][l_col] = bottom_layer[r]
                left_layer.reverse()
                rc[4][t_row] = left_layer
                for r in range(3):
                    rc[2][r][r_col] = top_layer[r]
                right_layer.reverse()
                rc[5][b_row] = right_layer
            else:
                for r in range(3):
                    rc[0][r][l_col] = top_layer[2 - r]
                rc[4][t_row] = right_layer
                for r in range(3):
                    rc[2][r][r_col] = bottom_layer[2 - r]
                rc[5][b_row] = left_layer

    # make a move
    def make_move(self, move):
        if move == 'U':
            self._rotate_row(0)
            self._rotate_face(4)
        elif move == 'D': 
            self._rotate_row(2, False)
            self._rotate_face(5)
        elif move == 'R':
            self._rotate_column(2, False)
            self._rotate_face(2)
        elif move == 'L':
            self._rotate_column(0)
            self._rotate_face(0)
        elif move == 'F':
            self._rotate_layer(0)
            self._rotate_face(1)
        elif move == 'B':
            self._rotate_layer(2, False)
            self._rotate_face(3)
        elif move == 'U\'':
            self._rotate_row(0, False)
            self._rotate_face(4, False)
        elif move == 'D\'':
            self._rotate_row(2)
            self._rotate_face(5, False)
        elif move == 'R\'':
            self._rotate_column(2)
            self._rotate_face(2, False)
        elif move == 'L\'':
            self._rotate_column(0, False)
            self._rotate_face(0, False)
        elif move == 'F\'':
            self._rotate_layer(0, False)
            self._rotate_face(1, False)
        elif move == 'B\'':
            self._rotate_layer(2)
            self._rotate_face(3, False)
        elif move == 'U2':
            self._rotate_row(0, times=2)
            self._rotate_face(4, times=2)
        elif move == 'D2':
            self._rotate_row(2, False, times=2)
            self._rotate_face(5, times=2)
        elif move == 'R2':
            self._rotate_column(2, False, 2)
            self._rotate_face(2, times=2)
        elif move == 'L2':
            self._rotate_column(0, times=2)
            self._rotate_face(0, times=2)
        elif move == 'F2':
            self._rotate_layer(0, times=2)
            self._rotate_face(1, times=2)
        elif move == 'B2':
            self._rotate_layer(2, False, 2)
            self._rotate_face(3, times=2)
        elif move == 'Uw' or move == 'u':
            self._rotate_row(0)
            self._rotate_row(1)
            self._rotate_face(4)
        elif move == 'Dw' or move == 'd':
            self._rotate_row(2, False)
            self._rotate_row(1, False)
            self._rotate_face(5)
        elif move == 'Rw' or move == 'r':
            self._rotate_column(2, False)
            self._rotate_column(1, False)
            self._rotate_face(2)
        elif move == 'Lw' or move == 'l':
            self._rotate_column(0)
            self._rotate_column(1)
            self._rotate_face(0)
        elif move == 'Fw' or move == 'f':
            self._rotate_layer(0, False)
            self._rotate_layer(1, False)
            self._rotate_face(1, False)
        elif move == 'Bw' or move == 'b':
            self._rotate_layer(2, False)
            self._rotate_layer(1, False)
            self._rotate_face(3)
        elif move == 'Uw\'' or move == 'u\'':
            self._rotate_row(0, False)
            self._rotate_row(1, False)
            self._rotate_face(4, False)
        elif move == 'Dw\'' or move == 'd\'':
            self._rotate_row(2)
            self._rotate_row(1)
            self._rotate_face(5, False)
        elif move == 'Rw\'' or move == 'r\'':
            self._rotate_column(2)
            self._rotate_column(1)
            self._rotate_face(2, False)
        elif move == 'Lw\'' or move == 'l\'':
            self._rotate_column(0, False)
            self._rotate_column(1, False)
            self._rotate_face(0, False)
        elif move == 'Fw\'' or move == 'f\'':
            self._rotate_layer(0, False)
            self._rotate_layer(1, False)
            self._rotate_face(1, False)
        elif move == 'Bw\'' or move == 'b\'':
            self._rotate_layer(2)
            self._rotate_layer(1)
            self._rotate_face(3, False)
        elif move == 'Uw2' or move == 'u2':
            self._rotate_row(0, times=2)
            self._rotate_row(1, times=2)
            self._rotate_face(4, times=2)
        elif move == 'Dw2' or move == 'd2':
            self._rotate_row(2, False, times=2)
            self._rotate_row(1, False, times=2)
            self._rotate_face(5, times=2)
        elif move == 'Rw2' or move == 'r2':
            self._rotate_column(2, False, 2)
            self._rotate_column(1, False, 2)
            self._rotate_face(2, times=2)
        elif move == 'Lw2' or move == 'l2':
            self._rotate_column(0, times=2)
            self._rotate_column(1, times=2)
            self._rotate_face(0, times=2)
        elif move == 'Fw2' or move == 'f2':
            self._rotate_layer(0, times=2)
            self._rotate_layer(1, times=2)
            self._rotate_face(1, times=2)
        elif move == 'Bw2' or move == 'b2':
            self._rotate_layer(2, False, 2)
            self._rotate_layer(1, False, 2)
            self._rotate_face(3, times=2)
        elif move == 'x':
            self._rotate_column(0, False)
            self._rotate_column(1, False)
            self._rotate_column(2, False)
            self._rotate_face(0, False)
            self._rotate_face(2)
        elif move == 'y':
            self._rotate_row(0)
            self._rotate_row(1)
            self._rotate_row(2)
            self._rotate_face(4)
            self._rotate_face(5, False)
        elif move == 'z':
            self._rotate_layer(0)
            self._rotate_layer(1)
            self._rotate_layer(2)
            self._rotate_face(1)
            self._rotate_face(3, False)
        elif move == 'x\'':
            self._rotate_column(0)
            self._rotate_column(1)
            self._rotate_column(2)
            self._rotate_face(0)
            self._rotate_face(2, True)
        elif move == 'y\'':
            self._rotate_row(0, False)
            self._rotate_row(1, False)
            self._rotate_row(2, False)
            self._rotate_face(4, False)
            self._rotate_face(5)
        elif move == 'z\'':
            self._rotate_layer(0, False)
            self._rotate_layer(1, False)
            self._rotate_layer(2, False)
            self._rotate_face(1, False)
            self._rotate_face(3)
        elif move == 'x2':
            self._rotate_column(0, False, 2)
            self._rotate_column(1, False, 2)
            self._rotate_column(2, False, 2)
            self._rotate_face(0, False, 2)
            self._rotate_face(2, times=2)
        elif move == 'y2':
            self._rotate_row(0, times=2)
            self._rotate_row(1, times=2)
            self._rotate_row(2, times=2)
            self._rotate_face(4, times=2)
            self._rotate_face(5, False, 2)
        elif move == 'z2':
            self._rotate_layer(0, times=2)
            self._rotate_layer(1, times=2)
            self._rotate_layer(2, times=2)
            self._rotate_face(1, times=2)
            self._rotate_face(3, False, 2)
        elif move == 'M':
            self._rotate_column(1)
        elif move == 'E':
            self._rotate_row(1, False)
        elif move == 'S':
            self._rotate_layer(1)
        elif move == 'M\'':
            self._rotate_column(1, False)
        elif move == 'E\'':
            self._rotate_row(1)
        elif move == 'S\'':
            self._rotate_layer(1, False)
        elif move == 'M2':
            self._rotate_column(1, times=2)
        elif move == 'E2':
            self._rotate_row(1, times=2)
        elif move == 'S2':
            self._rotate_layer(1, times=2)
