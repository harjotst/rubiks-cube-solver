//
// Created by Harjot Tathgur on 2024-09-28.
//

#ifndef RUBIKS_CUBE_SOLVER_H
#define RUBIKS_CUBE_SOLVER_H

#include <fstream>

#include "rubiks-cube-information.h"

#include <unordered_map>
#include <unordered_set>

#include "rubiks-cube-pattern-key.h"

using namespace std;

#include <array>

class RubiksCubeSolver {
    vector<string> moves = {"U", "D", "R", "L", "F", "B", "U'", "D'", "R'", "L'", "F'", "B'", "U2", "D2", "R2", "L2", "F2", "B2"};
    RubiksCubeInformation & rubiksCubeInformation;
    RubiksCubePatternKey & rubiksCubePatternKey;
    vector<unordered_map<uint64_t, int>> & maps;
    ofstream output;

    int heuristic(uint64_t cornerKeys, uint64_t edgeKeys, uint64_t otherEdgeKeys) const;

    void getSuccessors(uint64_t cornerKeys, uint64_t edgeKeys,
        uint64_t otherEdgeKeys, vector<tuple<array<uint64_t, 3>, string>> & successors);

    static bool isGoal(uint64_t cornerKeys, uint64_t edgeKeys, uint64_t otherEdgeKeys);

    tuple<stack<tuple<array<uint64_t, 3>, string>>, int> IDAStar(uint64_t cornerKeys, uint64_t edgeKeys,
        uint64_t otherEdgeKeys);

    int search(stack<tuple<array<uint64_t, 3>, string>> &path,
                  unordered_set<string> &pathSet,
                  int g,
                  int bound);

public:
    RubiksCubeSolver(RubiksCubeInformation &rubiksCubeInformation, RubiksCubePatternKey &rubiksCubePatternKey,
                     vector<unordered_map<uint64_t, int>> &maps);

    tuple<stack<tuple<array<uint64_t, 3>, string>>, int> solve(RubiksCube &cube);
};

#endif //RUBIKS_CUBE_SOLVER_H
