from rubiks_cube import RubiksCube

class CornersPDBGenerator:
    def __init__(self, goal: RubiksCube):
        self.goal = goal
        self.cpdb = {}

    def _get_corners(self):
        rb = self.goal.rubiks_cube
        corners = []
        corners.append([rb[0][0][2][1], rb[1][0][0][1], rb[4][2][0][1]])
        corners.append([rb[1][0][2][1], rb[2][0][0][1], rb[4][2][2][1]])
        corners.append([rb[0][2][2][1], rb[1][2][0][1], rb[5][0][0][1]])
        corners.append([rb[1][2][2][1], rb[2][2][0][1], rb[5][0][2][1]])
        corners.append([rb[0][0][0][1], rb[3][0][2][1], rb[4][0][0][1]])
        corners.append([rb[2][0][2][1], rb[3][0][0][1], rb[4][0][2][1]])
        corners.append([rb[0][2][0][1], rb[3][2][2][1], rb[5][2][0][1]])
        corners.append([rb[2][2][2][1], rb[3][2][0][1], rb[5][2][2][1]])
        return corners
    
    def _determine_corner(self, sorted_corner):
        if sorted_corner == [0, 1, 4]:
            return 0
        elif sorted_corner == [1, 2, 4]:
            return 1
        elif sorted_corner == [0, 1, 5]:
            return 2
        elif sorted_corner == [1, 2, 5]:
            return 3
        elif sorted_corner == [0, 3, 4]:
            return 4
        elif sorted_corner == [2, 3, 4]:
            return 5
        elif sorted_corner == [0, 3, 5]:
            return 6
        elif sorted_corner == [2, 3, 5]:
            return 7
    
    def _determine_orientation(self, corner, sorted_corner):
        if corner == sorted_corner:
            return 0
        elif corner[1] == sorted_corner[0]:
            return 1
        elif corner[2] == sorted_corner[0]:
            return 2

    def _convert_corners_to_key(self):
        key = 0
        corners = self._get_corners()
        corners.reverse()
        for corner in corners:
            sorted_corner = sorted(corner)
            corner_type = self._determine_corner(sorted_corner)
            orientation = self._determine_orientation(corner, sorted_corner)
            key <<= 6
            key |= ((orientation & 0b11) << 4) | (corner_type & 0b1111)
        return key

    def generate_corners_pdb(self):
        something = self._convert_corners_to_key()

        while something > 0:
            six_bits = something & 0b111111
            print(format(six_bits, '06b'))
            something >>= 6

        pass