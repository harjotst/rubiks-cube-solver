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

    # rotate a face clockwise or anti-clockwise
    def _rotate_face(self, face, clockwise=True):
        f, rc = face, self.rubiks_cube
        if clockwise:
            rc[f][0][0], rc[f][0][2], rc[f][2][2], rc[f][2][0] = rc[f][2][0], rc[f][0][0], rc[f][0][2], rc[f][2][2]
            rc[f][1][2], rc[f][2][1], rc[f][1][0], rc[f][0][1] = rc[f][0][1], rc[f][1][2], rc[f][2][1], rc[f][1][0]
        else:
            rc[f][2][0], rc[f][0][0], rc[f][0][2], rc[f][2][2] = rc[f][0][0], rc[f][0][2], rc[f][2][2], rc[f][2][0]
            rc[f][0][1], rc[f][1][2], rc[f][2][1], rc[f][1][0] = rc[f][1][2], rc[f][2][1], rc[f][1][0], rc[f][0][1]

    # turn a row clockwise or anti-clockwise
    def _turn_row(self, row, clockwise=True):
        r, rc = row, self.rubiks_cube
        if clockwise:
            rc[0][r], rc[1][r], rc[2][r], rc[3][r] = rc[1][r], rc[2][r], rc[3][r], rc[0][r]
        else:
            rc[1][r], rc[2][r], rc[3][r], rc[0][r] = rc[0][r], rc[1][r], rc[2][r], rc[3][r]

    # turn a column clockwise or anti-clockwise
    def _turn_column(self, column, clockwise=True):
        c, rc = column, self.rubiks_cube
        oc = 1 if c == 1 else 2 if c == 0 else 0
        if clockwise:
            for r in range(3):
                rc[1][r][c], rc[5][r][c], rc[4][r][c], rc[3][r][oc] = rc[4][r][c], rc[1][r][c], rc[3][r][oc], rc[5][r][c]
        else:
            for r in range(3):
                rc[4][r][c], rc[1][r][c], rc[3][r][oc], rc[5][r][c] = rc[1][r][c], rc[5][r][c], rc[4][r][c], rc[3][r][oc]
    
    # returns left column, top row, right column, and bottom row indices for layer
    def _translate_layer_to_columns_and_rows(self, layer):
        if layer == 0:
            return 2, 2, 0, 0
        elif layer == 1:
            return 1, 1, 1, 1
        else:
            return 0, 0, 2, 2

    # turn a layer clockwise or anti-clockwise
    def _turn_layer(self, layer, clockwise=True):
        rc = self.rubiks_cube
        l_col, t_row, r_col, b_row = self._translate_layer_to_columns_and_rows(layer)
        left_layer = [r[l_col] for r in rc[0]]
        top_layer = list(rc[4][t_row])
        right_layer = [r[r_col] for r in rc[2]]
        bottom_layer = list(rc[5][b_row])
        if clockwise:
            for r in range(3):
                rc[0][r][l_col] = bottom_layer[r]
            rc[4][t_row] = left_layer.reverse()
            for r in range(3):
                rc[2][r][r_col] = top_layer[r]
            rc[5][b_row] = right_layer.reverse()
        else:
            for r in range(3):
                rc[0][r][l_col] = top_layer[2 - r]
            rc[4][t_row] = right_layer
            for r in range(3):
                rc[2][r][r_col] = bottom_layer[2 - r]
            rc[5][b_row] = left_layer

    # make
    def make_move(self, move):
        pass

rubiks_cube = RubiksCube()

rubiks_cube.pretty_print()
