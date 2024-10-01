//
// Created by Harjot Tathgur on 2024-09-28.
//

#include "rubiks-cube-solver.h"

#include <array>

RubiksCubeSolver::RubiksCubeSolver(RubiksCubeInformation &rubiksCubeInformation,
                                   RubiksCubePatternKey &rubiksCubePatternKey,
                                   vector<unordered_map<uint64_t, int>> &maps) :
    rubiksCubeInformation(rubiksCubeInformation), rubiksCubePatternKey(rubiksCubePatternKey), maps(maps) {
    output = ofstream("/Users/hairymammoth/Documents/rubiks-cube-solver/solver/output.txt");
}

int RubiksCubeSolver::heuristic(const uint64_t cornerKeys, const uint64_t edgeKeys, const uint64_t otherEdgeKeys) const {
    return max(max(maps[0][cornerKeys], maps[1][edgeKeys]), maps[2][otherEdgeKeys]);
}

void RubiksCubeSolver::getSuccessors(const uint64_t cornerKeys, const uint64_t edgeKeys, const uint64_t otherEdgeKeys,
                                     vector<tuple<array<uint64_t, 3>, string>> &successors) {
    RubiksCube *cube = rubiksCubePatternKey.fromKeysToRubiksCube(cornerKeys, edgeKeys, otherEdgeKeys);
    for (const auto& move: moves) {
        cube->makeMove(move);
        auto keys = rubiksCubePatternKey.fromRubiksCubeToKeys(*cube);
        // cout << keys[0] << " " << keys[1] << " " << keys[2] << endl;
        // cube->prettyPrint();
        successors.emplace_back(keys, move);
        cube->undoLastMove();
    }
    delete cube;
}

bool RubiksCubeSolver::isGoal(const uint64_t cornerKeys, const uint64_t edgeKeys, const uint64_t otherEdgeKeys) {
    return cornerKeys == 1144132807 && edgeKeys == 142540525692518 && otherEdgeKeys == 112589992993613;
}

// Function to serialize three uint64_t values into a string
string serialize_uint64_t(const uint64_t a, const uint64_t b, const uint64_t c) {
    string key(sizeof(uint64_t) * 3, '\0'); // 24 bytes
    memcpy(&key[0], &a, sizeof(uint64_t));
    memcpy(&key[sizeof(uint64_t)], &b, sizeof(uint64_t));
    memcpy(&key[2 * sizeof(uint64_t)], &c, sizeof(uint64_t));
    return key;
}

tuple<stack<tuple<array<uint64_t, 3>, string>>, int>
RubiksCubeSolver::IDAStar(const uint64_t cornerKeys, const uint64_t edgeKeys, const uint64_t otherEdgeKeys) {
    int heuristicBound = heuristic(cornerKeys, edgeKeys, otherEdgeKeys);
    // output << "heuristicBound: " << heuristicBound << endl;
    stack<tuple<array<uint64_t, 3>, string>> pathToSolution;
    array<uint64_t, 3> statess = { cornerKeys, edgeKeys, otherEdgeKeys };
    pathToSolution.emplace(statess, "");
    unordered_set<string> pathToSolutionSet;
    pathToSolutionSet.insert(serialize_uint64_t(cornerKeys, edgeKeys, otherEdgeKeys));
    for (;;) {
        const int newHeuristicBound = search(pathToSolution, pathToSolutionSet, 0, heuristicBound);
        // output << "newHeuristicBound: " << newHeuristicBound << endl;
        if (newHeuristicBound == 0)
            return make_tuple(pathToSolution, heuristicBound);
        if (newHeuristicBound == 127)
            return make_tuple(pathToSolution, 127);
        heuristicBound = newHeuristicBound;
    }
}

// void printStack(const stack<array<uint64_t, 3>>& stack) {
//     // Create a copy of the original stack so that we can pop from the copy without modifying the original
//     stack<array<uint64_t, 3>> tempStack = stack;
//
//     // Loop through the temporary stack until it's empty
//     while (!tempStack.empty()) {
//         // Access the top tuple
//         const auto& topTuple = tempStack.top();
//         // Unpack and print the tuple elements
//         cout << "Tuple: ("
//                   << get<0>(topTuple) << ", "
//                   << get<1>(topTuple) << ", "
//                   << get<2>(topTuple) << "), ";
//         // Pop the top element from the temporary stack
//         tempStack.pop();
//     }
//
//     cout << endl;
// }

int RubiksCubeSolver::search(stack<tuple<array<uint64_t, 3>, string>> &path,
                            unordered_set<string> &pathSet,
                            const int g,
                            const int bound) {
    const tuple<array<uint64_t, 3>, string> lastState = path.top();
    const array<uint64_t, 3> states = get<0>(lastState);
    if (const int f = g + heuristic(states[0], states[1], states[2]); f > bound)
        return f;
    if (isGoal(states[0], states[1], states[2]))
        return 0;
    int min = 127;
    vector<tuple<array<uint64_t, 3>, string>> successors(18);
    getSuccessors(states[0], states[1], states[2], successors);
    for (auto &successor: successors) {
        if (const string key = serialize_uint64_t(get<0>(successor)[0], get<0>(successor)[1], get<0>(successor)[2]);
            !pathSet.contains(key)) {
            path.push(successor);
            pathSet.insert(key);
            const int newHeuristicBound = search(path, pathSet, g + 1, bound);
            if (newHeuristicBound == 0)
                return 0;
            if (newHeuristicBound < min)
                min = newHeuristicBound;
            pathSet.erase(key);
            path.pop();
        }
    }
    return min;
}

tuple<stack<tuple<array<uint64_t, 3>, string>>, int> RubiksCubeSolver::solve(RubiksCube &cube) {
    const array<uint64_t, 3> keys = rubiksCubePatternKey.fromRubiksCubeToKeys(cube);
    // output << keys[0] << " " << keys[1] << " " << keys[2] << endl;
    return IDAStar(keys[0], keys[1], keys[2]);
}
