//
// Created by Harjot Tathgur on 2024-09-27.
//

#ifndef RUBIKS_CUBE_INFORMATION_H
#define RUBIKS_CUBE_INFORMATION_H

#include <unordered_map>
#include <vector>

using namespace std;

class RubiksCubeInformation {
public:
    unordered_map<int, int> cornerFaceProductToType;
    unordered_map<int, int> edgeFaceProductToType;
    unordered_map<int, vector<vector<int>>> cornerPositionToIndices;
    unordered_map<int, vector<vector<int>>> edgePositionToIndices;
    unordered_map<int, unordered_map<int, vector<vector<int>>>> cornerOrientationForCornerTypeAndPosition;
    unordered_map<int, unordered_map<int, vector<vector<int>>>> edgeOrientationForEdgeTypeAndPosition;
    unordered_map<string, string> oppositeMovetoMove;

    RubiksCubeInformation(
        const string & cornerFaceProductToTypePath,
        const string & edgeFaceProductToTypePath,
        const string & cornerPositionToIndicesPath,
        const string & edgePositionToIndicesPath,
        const string & cornerOrientationForCornerTypeAndPositionPath,
        const string & edgeOrientationForEdgeTypeAndPositionPath,
        const string & oppositeMovetoMovePath);

    static void printMap(const unordered_map<int, int> &map);

    static void printNestedMap(const unordered_map<int, vector<vector<int>>> &map);

    static void printDoubleNestedMap(
        const unordered_map<int, unordered_map<int, vector<vector<int>>>> &map);
};

#endif //RUBIKS_CUBE_INFORMATION_H
