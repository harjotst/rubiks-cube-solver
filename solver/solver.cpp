#include <fstream>
#include <iostream>
#include <sstream>

#include "map-loader.h"
#include "rubiks-cube-information.h"
#include "rubiks-cube-pattern-key.h"
#include "rubiks-cube-solver.h"
#include "rubiks-cube.h"

using namespace std;

int main() {
    RubiksCubeInformation rbi(
        "/Users/hairymammoth/Documents/rubiks-cube-solver/solver/precompute/corner-face-product-to-type.json",
        "/Users/hairymammoth/Documents/rubiks-cube-solver/solver/precompute/edge-face-product-to-type.json",
        "/Users/hairymammoth/Documents/rubiks-cube-solver/solver/precompute/corner-positions-to-indices.json",
        "/Users/hairymammoth/Documents/rubiks-cube-solver/solver/precompute/edge-positions-to-indices.json",
        "/Users/hairymammoth/Documents/rubiks-cube-solver/solver/precompute/corner-orientations-for-corner-type-and-position.json",
        "/Users/hairymammoth/Documents/rubiks-cube-solver/solver/precompute/edge-orientations-for-edge-type-and-position.json",
        "/Users/hairymammoth/Documents/rubiks-cube-solver/solver/precompute/opposite-moves.json");

    // // Create an instance of MapLoader
    MapLoader loader(
        make_tuple("/Users/hairymammoth/Documents/rubiks-cube-solver/solver/heuristics/moves-to-solved-corners.txt", 88179840),
        make_tuple("/Users/hairymammoth/Documents/rubiks-cube-solver/solver/heuristics/new-moves-to-solved-edges.txt", 42577920),
        make_tuple("/Users/hairymammoth/Documents/rubiks-cube-solver/solver/heuristics/new-moves-to-solved-other-edges.txt", 42577920));

    // Load maps concurrently
    loader.loadMapsConcurrently();

    cout << "Done loading maps..." << endl;

    vector<unordered_map<uint64_t, int>> & maps = loader.retrieveMaps();

    cout << "Done getting maps..." << endl;

    RubiksCubePatternKey rcpk(&rbi);

    cout << "Creating solver..." << endl;

    RubiksCubeSolver solver(rbi, rcpk, maps);

    cout << "Created solver..." << endl;

    for (;;) {
        string moves;
        cout << "Please enter the moves: " << endl;
        getline(cin, moves);
        if (cin.eof()) break;
        stringstream movesSeperated(moves);
        string move;
        RubiksCube cube(&rbi);
        while (movesSeperated >> move) {
            cube.makeMove(move);
        }
        auto result = solver.solve(cube);
        cout << "Number of moves to solve" << get<1>(result) << endl;
        auto states = get<0>(result);
        vector<tuple<array<uint64_t, 3>, string>> chronologicalStates;
        while (!states.empty()) {
            chronologicalStates.push_back(states.top());
            states.pop();
        }
        reverse(chronologicalStates.begin(), chronologicalStates.end());
        for(tuple<array<uint64_t, 3>, string> state : chronologicalStates) {
            auto rubiksCubeState = rcpk.fromKeysToRubiksCube(get<0>(state)[0], get<0>(state)[1], get<0>(state)[2]);
            string message = get<1>(state) == "" ? "Start State" : "Move: " + get<1>(state);
            cout << message << endl;
            rubiksCubeState->prettyPrint();
            delete rubiksCubeState;
        }
    }



    // RubiksCube rb(&rbi);

    // rb.makeMove("R'");
    //
    // rb.prettyPrint();
    //
    // rb.makeMove("F'  ");
    //
    // rb.prettyPrint();
    //
    // rb.undoLastMove();
    //
    // rb.prettyPrint();

    // rb.makeMove("U");

    // auto ogKeys = rcpk.fromRubiksCubeToKeys(rb);
    //
    // vector<string> moves = {"U", "D", "R", "L", "F", "B", "U'", "D'", "R'", "L'", "F'", "B'", "U2", "D2", "R2", "L2", "F2", "B2"};
    //
    // RubiksCube *cube = rcpk.fromKeysToRubiksCube(ogKeys[0], ogKeys[1], ogKeys[2]);
    //
    // // cube->prettyPrint();
    //
    // cube->makeMove("U");
    //
    // // cube->prettyPrint();
    //
    // for (auto &move: moves) {
    //     cout << "Move: " << move << endl << "Before move:" << endl;
    //     cube->prettyPrint();
    //     cube->makeMove(move);
    //     cout << "After move: " << endl;
    //     cube->prettyPrint();
    //     auto keys = rcpk.fromRubiksCubeToKeys(*cube);
    //     cout << "Keys: " << keys[0] << " " << keys[1] << " " << keys[2] << endl;
    //     cube->undoLastMove();
    //     cout << "After undo: " << endl;
    //     cube->prettyPrint();
    //     cout << "*********************************************************************************************" << endl;
    // }
    // delete cube;

    return 0;
}
