#include "rubiks-cube.h"

// Constructor
RubiksCube::RubiksCube(RubiksCubeInformation* rubiksCubeInformation, bool putStickers) {
    assembleRubiksCube(putStickers);
    this->information = rubiksCubeInformation;
}

// Assemble the Rubik's Cube
void RubiksCube::assembleRubiksCube(bool putStickers) {
    faces.resize(6);
    for (int i = 0; i < 6; ++i) {
        faces[i].resize(3, vector<int>(3));
        for (int j = 0; j < 3; ++j) {
            for (int k = 0; k < 3; ++k) {
                faces[i][j][k] = putStickers ? i : 6;
            }
        }
    }
}

// Rotate a face clockwise or counter-clockwise
void RubiksCube::rotateFace(int face, bool clockwise, int times) {
    for (int t = 0; t < times; ++t) {
        auto& matrix = faces[face];
        if (clockwise) {
            // Transpose and then reverse each row
            for (int i = 0; i < 3; ++i) {
                for (int j = i; j < 3; ++j) {
                    swap(matrix[i][j], matrix[j][i]);
                }
            }
            for (auto& row : matrix) {
                reverse(row.begin(), row.end());
            }
        } else {
            // Reverse each row and then transpose
            for (auto& row : matrix) {
                reverse(row.begin(), row.end());
            }
            for (int i = 0; i < 3; ++i) {
                for (int j = i; j < 3; ++j) {
                    swap(matrix[i][j], matrix[j][i]);
                }
            }
        }
    }
}

// Rotate a row left or right
void RubiksCube::rotateRow(int row, bool left, int times) {
    for (int t = 0; t < times; ++t) {
        if (left) {
            vector<int> temp = faces[0][row];
            faces[0][row] = faces[1][row];
            faces[1][row] = faces[2][row];
            faces[2][row] = faces[3][row];
            faces[3][row] = temp;
        } else {
            vector<int> temp = faces[3][row];
            faces[3][row] = faces[2][row];
            faces[2][row] = faces[1][row];
            faces[1][row] = faces[0][row];
            faces[0][row] = temp;
        }
    }
}

// Rotate a column up or down
void RubiksCube::rotateColumn(int column, bool down, int times) {
    for (int t = 0; t < times; ++t) {
        int oc = (column == 1) ? 1 : (column == 0) ? 2 : 0;
        vector<int> temp(3);

        if (down) {
            // Store face 1 column
            for (int i = 0; i < 3; ++i) temp[i] = faces[1][i][column];

            // Face 1 column = Face 4 column
            for (int i = 0; i < 3; ++i) faces[1][i][column] = faces[4][i][column];

            // Face 4 column = Face 3 column (flipped)
            for (int i = 0; i < 3; ++i)
                faces[4][i][column] = faces[3][2 - i][oc];

            // Face 3 column = Face 5 column (flipped)
            for (int i = 0; i < 3; ++i)
                faces[3][i][oc] = faces[5][2 - i][column];

            // Face 5 column = temp
            for (int i = 0; i < 3; ++i)
                faces[5][i][column] = temp[i];
        } else {
            // Similar logic for the opposite rotation
            for (int i = 0; i < 3; ++i) temp[i] = faces[4][i][column];

            for (int i = 0; i < 3; ++i) faces[4][i][column] = faces[1][i][column];

            for (int i = 0; i < 3; ++i)
                faces[1][i][column] = faces[5][i][column];

            for (int i = 0; i < 3; ++i)
                faces[5][i][column] = faces[3][2 - i][oc];

            for (int i = 0; i < 3; ++i)
                faces[3][i][oc] = temp[2 - i];
        }
    }
}

// Translate layer to columns and rows
tuple<int, int, int, int> RubiksCube::translateLayerToColumnsAndRows(int layer) {
    if (layer == 0) {
        return make_tuple(2, 2, 0, 0);
    } else if (layer == 1) {
        return make_tuple(1, 1, 1, 1);
    } else {
        return make_tuple(0, 0, 2, 2);
    }
}

// Rotate a layer
void RubiksCube::rotateLayer(int layer, bool clockwise, int times) {
    for (int t = 0; t < times; ++t) {
        auto [l_col, t_row, r_col, b_row] = translateLayerToColumnsAndRows(layer);
        vector<int> left_layer(3), top_layer(3), right_layer(3), bottom_layer(3);

        // Extract layers
        for (int i = 0; i < 3; ++i) {
            left_layer[i] = faces[0][i][l_col];
            top_layer[i] = faces[4][t_row][i];
            right_layer[i] = faces[2][i][r_col];
            bottom_layer[i] = faces[5][b_row][i];
        }

        if (clockwise) {
            for (int i = 0; i < 3; ++i) {
                faces[0][i][l_col] = bottom_layer[i];
                faces[4][t_row][i] = left_layer[2 - i];
                faces[2][i][r_col] = top_layer[i];
                faces[5][b_row][i] = right_layer[2 - i];
            }
        } else {
            for (int i = 0; i < 3; ++i) {
                faces[0][i][l_col] = top_layer[2 - i];
                faces[4][t_row][i] = right_layer[i];
                faces[2][i][r_col] = bottom_layer[2 - i];
                faces[5][b_row][i] = left_layer[i];
            }
        }
    }
}

// Make a move
void RubiksCube::makeMove(const string& move, bool recordMove) {
    if (move == "U") {
        rotateRow(0);
        rotateFace(4);
    } else if (move == "D") {
        rotateRow(2, false);
        rotateFace(5);
    } else if (move == "R") {
        rotateColumn(2, false);
        rotateFace(2);
    } else if (move == "L") {
        rotateColumn(0);
        rotateFace(0);
    } else if (move == "F") {
        rotateLayer(0);
        rotateFace(1);
    } else if (move == "B") {
        rotateLayer(2, false);
        rotateFace(3);
    } else if (move == "U'") {
        rotateRow(0, false);
        rotateFace(4, false);
    } else if (move == "D'") {
        rotateRow(2);
        rotateFace(5, false);
    } else if (move == "R'") {
        rotateColumn(2);
        rotateFace(2, false);
    } else if (move == "L'") {
        rotateColumn(0, false);
        rotateFace(0, false);
    } else if (move == "F'") {
        rotateLayer(0, false);
        rotateFace(1, false);
    } else if (move == "B'") {
        rotateLayer(2);
        rotateFace(3, false);
    } else if (move == "U2") {
        rotateRow(0, true, 2);
        rotateFace(4, true, 2);
    } else if (move == "D2") {
        rotateRow(2, false, 2);
        rotateFace(5, true, 2);
    } else if (move == "R2") {
        rotateColumn(2, false, 2);
        rotateFace(2, true, 2);
    } else if (move == "L2") {
        rotateColumn(0, true, 2);
        rotateFace(0, true, 2);
    } else if (move == "F2") {
        rotateLayer(0, true, 2);
        rotateFace(1, true, 2);
    } else if (move == "B2") {
        rotateLayer(2, false, 2);
        rotateFace(3, true, 2);
    } else {
        // Invalid move; do nothing
        return;
    }

    if (recordMove) {
        moves.push_back(move);
    }
}

// Undo the last move
void RubiksCube::undoLastMove() {
    if (moves.empty()) return;
    string lastMove = moves.back();
    moves.pop_back();
    string oppositeMove = information->oppositeMovetoMove[lastMove];
    makeMove(oppositeMove, false);
}

// Pretty print the cube
void RubiksCube::prettyPrint() {
    // Map colors to symbols
    unordered_map<int, string> colorMap = {
        {0, "🟧"}, {1, "🟦"}, {2, "🟥"}, {3, "🟩"},
        {4, "🟨"}, {5, "⬜️"}, {6, "⬛️"}
    };

    auto getRow = [&](int face, int row) {
        string s = "";
        for (int i = 0; i < 3; ++i) {
            s += colorMap[faces[face][row][i]];
        }
        return s;
    };

    cout << "       ########\n";
    cout << "       #" << getRow(4, 0) << "#\n";
    cout << "       #" << getRow(4, 1) << "#\n";
    cout << "       #" << getRow(4, 2) << "#\n";
    cout << string(29, '#') << "\n";
    for (int row = 0; row < 3; ++row) {
        cout << "#" << getRow(0, row) << "#" << getRow(1, row)
             << "#" << getRow(2, row) << "#" << getRow(3, row) << "#\n";
    }
    cout << string(29, '#') << "\n";
    cout << "       #" << getRow(5, 0) << "#\n";
    cout << "       #" << getRow(5, 1) << "#\n";
    cout << "       #" << getRow(5, 2) << "#\n";
    cout << "       ########\n";
}

// Get corner by indices
vector<int> RubiksCube::getCornerByIndices(const vector<vector<int>>& cornerIndices) {
    vector<int> corner;
    for (const auto& index : cornerIndices) {
        corner.push_back(faces[index[0]][index[1]][index[2]]);
    }
    return corner;
}

// Set corner by indices
void RubiksCube::setCornerByIndices(const vector<vector<int>>& cornerIndices, const vector<int>& tileColours) {
    for (size_t i = 0; i < cornerIndices.size(); ++i) {
        faces[cornerIndices[i][0]][cornerIndices[i][1]][cornerIndices[i][2]] = tileColours[i];
    }
}

// Get corner type
int RubiksCube::getCornerType(int cornerPosition) {
    const auto& cornerIndices = information->cornerPositionToIndices[cornerPosition];
    auto corner = getCornerByIndices(cornerIndices);
    int cornerProduct = (corner[0] + 1) * (corner[1] + 1) * (corner[2] + 1);
    return information->cornerFaceProductToType[cornerProduct];
}

// Get corner orientation
int RubiksCube::getCornerOrientation(int cornerPosition) {
    int cornerType = getCornerType(cornerPosition);
    const auto& orientations = information->cornerOrientationForCornerTypeAndPosition[cornerType][cornerPosition];
    const auto& cornerIndices = information->cornerPositionToIndices[cornerPosition];
    auto corner = getCornerByIndices(cornerIndices);
    for (int i = 0; i < orientations.size(); ++i) {
        if (orientations[i] == corner) return i;
    }
    return 0;
}

// Set corner type
void RubiksCube::setCornerType(int cornerPosition, int cornerType, int orientation) {
    const auto& cornerIndices = information->cornerPositionToIndices[cornerPosition];
    const auto& tileColours = information->cornerOrientationForCornerTypeAndPosition[cornerType][cornerPosition][orientation];
    setCornerByIndices(cornerIndices, tileColours);
}

// Get edge by indices
vector<int> RubiksCube::getEdgeByIndices(const vector<vector<int>>& edgeIndices) {
    vector<int> edge;
    for (const auto& index : edgeIndices) {
        edge.push_back(faces[index[0]][index[1]][index[2]]);
    }
    return edge;
}

// Set edge by indices
void RubiksCube::setEdgeByIndices(const vector<vector<int>>& edgeIndices, const vector<int>& tileColours) {
    for (size_t i = 0; i < edgeIndices.size(); ++i) {
        faces[edgeIndices[i][0]][edgeIndices[i][1]][edgeIndices[i][2]] = tileColours[i];
    }
}

// Get edge type
int RubiksCube::getEdgeType(int edgePosition) {
    const auto& edgeIndices = information->edgePositionToIndices[edgePosition];
    auto edge = getEdgeByIndices(edgeIndices);
    int edgeProduct = (edge[0] + 3) * (edge[1] + 3);
    return information->edgeFaceProductToType[edgeProduct];
}

// Get edge orientation
int RubiksCube::getEdgeOrientation(int edgePosition) {
    int edgeType = getEdgeType(edgePosition);
    const auto& orientations = information->edgeOrientationForEdgeTypeAndPosition[edgeType][edgePosition];
    const auto& edgeIndices = information->edgePositionToIndices[edgePosition];
    auto edge = getEdgeByIndices(edgeIndices);
    for (int i = 0; i < orientations.size(); ++i) {
        if (orientations[i] == edge) return i;
    }
    return 0;
}

// Set edge type
void RubiksCube::setEdgeType(int edgePosition, int edgeType, int orientation) {
    const auto& edgeIndices = information->edgePositionToIndices[edgePosition];
    const auto& tileColours = information->edgeOrientationForEdgeTypeAndPosition[edgeType][edgePosition][orientation];
    setEdgeByIndices(edgeIndices, tileColours);
}
