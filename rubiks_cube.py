import numpy as np

from rubiks_cube_information import RubiksCubeInformation

class RubiksCube:
    def __init__(self, rubiks_cube_information: RubiksCubeInformation, put_stickers=True):
        self._assemble_rubiks_cube(put_stickers)
        self.information = rubiks_cube_information
        self.moves = []

    # declare and initialize rubiks cube data structure
    def _assemble_rubiks_cube(self, put_stickers):
        if put_stickers:
            self.faces = np.arange(6, dtype=np.uint8).reshape(6, 1, 1) * np.ones((1, 3, 3), dtype=np.uint8)
        else:
            self.faces = np.full((6, 3, 3), 6, dtype=np.uint8)

    # rotate a face clockwise or anti-clockwise. "clockwise" from the perspective of that face "facing" you.
    def _rotate_face(self, face, clockwise=True, times=1):
        for _ in range(times):
            if clockwise:
                self.faces[face] = np.rot90(self.faces[face], 3)
            else:
                self.faces[face] = np.rot90(self.faces[face])

    # turn a row clockwise or anti-clockwise
    def _rotate_row(self, row, left=True, times=1):
        for _ in range(times):
            r, rc = row, self.faces
            if left:
                rc[0, r], rc[1, r], rc[2, r], rc[3, r] = rc[1, r].copy(), rc[2, r].copy(), rc[3, r].copy(), rc[0, r].copy()
            else:
                rc[1, r], rc[2, r], rc[3, r], rc[0, r] = rc[0, r].copy(), rc[1, r].copy(), rc[2, r].copy(), rc[3, r].copy()

    # turn a column clockwise or anti-clockwise
    def _rotate_column(self, column, down=True, times=1):
        for _ in range(times):
            c, fs = column, self.faces
            oc = 1 if c == 1 else 2 if c == 0 else 0
            if down:
                fs[1,:,c], fs[5,:,c], fs[3,:,oc], fs[4,:,c] = fs[4,:,c].copy(), fs[1,:,c].copy(), np.flipud(fs[5,:,c].copy()), np.flipud(fs[3,:,oc].copy())
            else:
                fs[4,:,c], fs[1,:,c], fs[5,:,c], fs[3,:,oc] = fs[1,:,c].copy(), fs[5,:,c].copy(), np.flipud(fs[3,:,oc].copy()), np.flipud(fs[4,:,c].copy())

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
            fs = self.faces
            l_col, t_row, r_col, b_row = self._translate_layer_to_columns_and_rows(layer)
            left_layer = fs[0,:,l_col].copy()
            top_layer = fs[4,t_row].copy()
            right_layer = fs[2,:,r_col].copy()
            bottom_layer = fs[5,b_row].copy()
            if clockwise:
                fs[0,:,l_col] = bottom_layer
                fs[4,t_row] = np.flipud(left_layer)
                fs[2,:,r_col] = top_layer
                fs[5,b_row] = np.flipud(right_layer)
            else:
                fs[0,:,l_col] = np.flipud(top_layer)
                fs[4,t_row] = right_layer
                fs[2,:,r_col] = np.flipud(bottom_layer)
                fs[5,b_row] = left_layer

    # get corner pointed to by indicies
    def _get_corner_by_indices(self, corner_indices):
        ci = corner_indices
        tile_one = self.faces[ci[0][0], ci[0][1], ci[0][2]]
        tile_two = self.faces[ci[1][0], ci[1][1], ci[1][2]]
        tile_three = self.faces[ci[2][0], ci[2][1], ci[2][2]]
        return [tile_one, tile_two, tile_three]

    # set corner pointed to by indices, certain colours
    def _set_corner_by_indices(self, corner_indices, tile_colours):
        ci = corner_indices
        self.faces[ci[0][0], ci[0][1], ci[0][2]] = tile_colours[0]
        self.faces[ci[1][0], ci[1][1], ci[1][2]] = tile_colours[1]
        self.faces[ci[2][0], ci[2][1], ci[2][2]] = tile_colours[2]

    # make a move
    def make_move(self, move, record_move=True):
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
        else:
            return
        if record_move:
            self.moves.append(move)

    # undo the last move
    def undo_last_move(self): 
        last_move = self.moves.pop()
        opposite_move = self.information.opposite_moves[last_move]
        self.make_move(opposite_move, False)

    # print rubiks cube in 2d representation
    def pretty_print(self):
        fs = self.faces
        pp = f"""       ########
       #{fs[4][0][0]}{fs[4][0][1]}{fs[4][0][2]}#
       #{fs[4][1][0]}{fs[4][1][1]}{fs[4][1][2]}#
       #{fs[4][2][0]}{fs[4][2][1]}{fs[4][2][2]}#
{'#' * 29}
#{fs[0][0][0]}{fs[0][0][1]}{fs[0][0][2]}#{fs[1][0][0]}{fs[1][0][1]}{fs[1][0][2]}#{fs[2][0][0]}{fs[2][0][1]}{fs[2][0][2]}#{fs[3][0][0]}{fs[3][0][1]}{fs[3][0][2]}#
#{fs[0][1][0]}{fs[0][1][1]}{fs[0][1][2]}#{fs[1][1][0]}{fs[1][1][1]}{fs[1][1][2]}#{fs[2][1][0]}{fs[2][1][1]}{fs[2][1][2]}#{fs[3][1][0]}{fs[3][1][1]}{fs[3][1][2]}#
#{fs[0][2][0]}{fs[0][2][1]}{fs[0][2][2]}#{fs[1][2][0]}{fs[1][2][1]}{fs[1][2][2]}#{fs[2][2][0]}{fs[2][2][1]}{fs[2][2][2]}#{fs[3][2][0]}{fs[3][2][1]}{fs[3][2][2]}#
{'#' * 29}
       #{fs[5][0][0]}{fs[5][0][1]}{fs[5][0][2]}#
       #{fs[5][1][0]}{fs[5][1][1]}{fs[5][1][2]}#
       #{fs[5][2][0]}{fs[5][2][1]}{fs[5][2][2]}#
       ########"""
        pp = pp.replace('0', '🟧').replace('1', '🟦').replace('2', '🟥').replace('3', '🟩').replace('4', '🟨').replace('5', '⬜️').replace('6', '⬛️')
        print(pp)

    # return corner type at corner position
    def get_corner_type(self, corner_position):
        corner_indicies = self.information.corner_indices[str(corner_position)]
        corner = self._get_corner_by_indices(corner_indicies)
        corner_product = str((corner[0] + 1) * (corner[1] + 1) * (corner[2] + 1))
        return self.information.corner_product_to_type[corner_product]

    # return orientation of corner at position
    def get_corner_orientation(self, corner_position):
        corner_type = self.get_corner_type(corner_position)
        orientations = self.information.corner_orientations[str(corner_type)][str(corner_position)]
        corner_indicies = self.information.corner_indices[str(corner_position)]
        corner = self._get_corner_by_indices(corner_indicies)
        return orientations.index(corner)

    # set corner type and orientation at corner position
    # this method doesn't check if corner type already exists in rubiks cube. user discretion advised.
    def set_corner_type(self, corner_position, corner_type, orientation):
        corner_indicies = self.information.corner_indices[str(corner_position)]
        tile_colours = self.information.corner_orientations[str(corner_type)][str(corner_position)][orientation]
        self._set_corner_by_indices(corner_indicies, tile_colours)

    # get edge pointed to by indicies
    def _get_edge_by_indices(self, edge_indices):
        ei = edge_indices
        tile_one = self.faces[ei[0][0], ei[0][1], ei[0][2]]
        tile_two = self.faces[ei[1][0], ei[1][1], ei[1][2]]
        return [tile_one, tile_two]

    # return edge type at edge position
    def get_edge_type(self, edge_position):
        edge_indicies = self.information.edge_positions_to_indices[str(edge_position)]
        edge = self._get_edge_by_indices(edge_indicies)
        edge_product = str((edge[0] + 3) * (edge[1] + 3))
        if edge_product == 81:
            print('here')
        return self.information.edge_face_product_to_type[edge_product]

    # return orientation of edge at position
    def get_edge_orientation(self, edge_position):
        edge_type = self.get_edge_type(edge_position)
        orientations = self.information.edge_orientations[str(edge_type)][str(edge_position)]
        edge_indicies = self.information.edge_positions_to_indices[str(edge_position)]
        edge = self._get_edge_by_indices(edge_indicies)
        return orientations.index(edge)

    # set edge pointed to by indices, certain colours
    def _set_edge_by_indices(self, edge_indices, tile_colours):
        ei = edge_indices
        self.faces[ei[0][0], ei[0][1], ei[0][2]] = tile_colours[0]
        self.faces[ei[1][0], ei[1][1], ei[1][2]] = tile_colours[1]

    # set edge type and orientation at edge position
    # this method doesn't check if edge type already exists in rubiks cube. user discretion advised.
    def set_edge_type(self, edge_position, edge_type, orientation):
        edge_indicies = self.information.edge_positions_to_indices[str(edge_position)]
        tile_colours = self.information.edge_orientations[str(edge_type)][str(edge_position)][orientation]
        self._set_edge_by_indices(edge_indicies, tile_colours)