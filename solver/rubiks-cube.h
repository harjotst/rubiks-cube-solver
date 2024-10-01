#ifndef RUBIKS_CUBE_H
#define RUBIKS_CUBE_H

#include "rubiks-cube-information.h"
#include <vector>
#include <string>
#include <unordered_map>
#include <iostream>
#include <algorithm>
#include <tuple>
#include <stack>

using namespace std;

class RubiksCube {
public:
    RubiksCube(RubiksCubeInformation* rubiksCubeInformation, bool putStickers = true);

    void makeMove(const string& move, bool recordMove = true);

    void undoLastMove();

    void prettyPrint();

    int getCornerType(int cornerPosition);

    int getCornerOrientation(int cornerPosition);

    void setCornerType(int cornerPosition, int cornerType, int orientation);

    int getEdgeType(int edgePosition);

    int getEdgeOrientation(int edgePosition);

    void setEdgeType(int edgePosition, int edgeType, int orientation);

private:
    void assembleRubiksCube(bool putStickers);

    void rotateFace(int face, bool clockwise = true, int times = 1);

    void rotateRow(int row, bool left = true, int times = 1);

    void rotateColumn(int column, bool down = true, int times = 1);

    void rotateLayer(int layer, bool clockwise = true, int times = 1);

    tuple<int, int, int, int> translateLayerToColumnsAndRows(int layer);

    vector<int> getCornerByIndices(const vector<vector<int>>& cornerIndices);

    void setCornerByIndices(const vector<vector<int>>& cornerIndices, const vector<int>& tileColours);

    vector<int> getEdgeByIndices(const vector<vector<int>>& edgeIndices);

    void setEdgeByIndices(const vector<vector<int>>& edgeIndices, const vector<int>& tileColours);

    RubiksCubeInformation* information;
    vector<vector<vector<int>>> faces;
    vector<string> moves;
};

#endif // RUBIKS_CUBE_H
