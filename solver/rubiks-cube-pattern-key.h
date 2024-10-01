#ifndef RUBIKS_CUBE_PATTERN_KEY_H
#define RUBIKS_CUBE_PATTERN_KEY_H

#include "rubiks-cube.h"
#include <cstdint>
#include <iostream>
#include <bitset>

class RubiksCubePatternKey {
public:
    RubiksCubePatternKey(RubiksCubeInformation* rubiks_cube_information);

    uint64_t fromRubiksCubeToCornersKey(RubiksCube& rubiks_cube);

    uint64_t fromRubiksCubeToAllEdgesKey(RubiksCube& rubiks_cube);

    RubiksCube fromCornersKeyToRubiksCube(uint64_t corner_key);

    RubiksCube fromAllEdgesKeyToRubiksCube(uint64_t edge_key);

    static uint64_t fromAllEdgesKeyToEdgesKey(uint64_t all_edges_key);

    static uint64_t fromAllEdgesKeyToOtherEdgesKey(uint64_t all_edges_key);

    array<uint64_t, 3> fromRubiksCubeToKeys(RubiksCube & rubiksCube);

    RubiksCube * fromKeysToRubiksCube(uint64_t cornerKeys, uint64_t edgeKeys, uint64_t otherEdgeKey);

    void printCornerKey(uint64_t key);

    // ****************************************************************************************************************

private:
    RubiksCubeInformation* information;
};

#endif // RUBIKS_CUBE_PATTERN_KEY_H
