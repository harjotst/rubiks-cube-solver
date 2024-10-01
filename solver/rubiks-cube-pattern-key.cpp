#include "rubiks-cube-pattern-key.h"

// Constructor
RubiksCubePatternKey::RubiksCubePatternKey(RubiksCubeInformation* rubiks_cube_information) {
    this->information = rubiks_cube_information;
}

// Create 40-bit key from corner positions and orientations
uint64_t RubiksCubePatternKey::fromRubiksCubeToCornersKey(RubiksCube& rubiks_cube) {
    uint64_t corner_key = 0;
    for (int corner_position = 0; corner_position < 8; ++corner_position) {
        int corner_type = rubiks_cube.getCornerType(corner_position);
        int orientation = rubiks_cube.getCornerOrientation(corner_position);
        corner_key <<= 5;
        corner_key |= ((orientation & 0b11) << 3) | (corner_type & 0b111);
    }
    return corner_key;
}

// Create 60-bit key from edge positions and orientations
uint64_t RubiksCubePatternKey::fromRubiksCubeToAllEdgesKey(RubiksCube& rubiks_cube) {
    uint64_t all_edges_key = 0;
    for (int edge_position = 0; edge_position < 12; ++edge_position) {
        int edge_type = rubiks_cube.getEdgeType(edge_position);
        int orientation = rubiks_cube.getEdgeOrientation(edge_position);
        all_edges_key <<= 5;
        all_edges_key |= ((orientation & 0b1) << 4) | (edge_type & 0b1111);
    }
    return all_edges_key;
}

// Load corner types and orientations from 40-bit key
RubiksCube RubiksCubePatternKey::fromCornersKeyToRubiksCube(uint64_t corner_key) {
    RubiksCube rubiks_cube(this->information, false);
    for (int i = 0; i < 40; i += 5) {
        uint64_t chunk = (corner_key >> (35 - i)) & 0b11111;
        int corner_position = i / 5;
        int corner_type = chunk & 0b111;
        int orientation = (chunk & 0b11000) >> 3;
        rubiks_cube.setCornerType(corner_position, corner_type, orientation);
    }
    return rubiks_cube;
}

// Load edge types and orientations from 60-bit key
RubiksCube RubiksCubePatternKey::fromAllEdgesKeyToRubiksCube(uint64_t edge_key) {
    RubiksCube rubiks_cube(this->information, false);
    for (int i = 0; i < 60; i += 5) {
        uint64_t chunk = (edge_key >> (55 - i)) & 0b11111;
        int edge_position = i / 5;
        int edge_type = chunk & 0b1111;
        int orientation = (chunk & 0b10000) >> 4;
        rubiks_cube.setEdgeType(edge_position, edge_type, orientation);
    }
    return rubiks_cube;
}

// Convert all edges key to edges key for edges with type <= 5
uint64_t RubiksCubePatternKey::fromAllEdgesKeyToEdgesKey(uint64_t all_edges_key) {
    uint64_t edges_key = 0;
    for (int i = 0; i < 60; i += 5) {
        const uint64_t chunk = (all_edges_key >> (55 - i)) & 0b11111;
        const int edge_type = chunk & 0b1111;
        edges_key <<= 4;
        if (edge_type <= 5) {
            const int orientation = (chunk & 0b10000) >> 4;
            edges_key |= ((orientation & 0b1) << 3) | (edge_type & 0b111);
        } else {
            edges_key |= 6;
        }
    }
    return edges_key;
}

// Convert all edges key to edges key for edges with type >= 6
uint64_t RubiksCubePatternKey::fromAllEdgesKeyToOtherEdgesKey(uint64_t all_edges_key) {
    uint64_t edges_key = 0;
    for (int i = 0; i < 60; i += 5) {
        uint64_t chunk = (all_edges_key >> (55 - i)) & 0b11111;
        int edge_type = chunk & 0b1111;
        edges_key <<= 4;
        if (edge_type >= 6) {
            int orientation = (chunk & 0b10000) >> 4;
            edges_key |= ((orientation & 0b1) << 3) | ((edge_type - 6) & 0b111);
        } else {
            edges_key |= 6;
        }
    }
    return edges_key;
}

RubiksCube * RubiksCubePatternKey::fromKeysToRubiksCube(uint64_t cornerKey, uint64_t edgeKey, uint64_t otherEdgeKey) {
    auto * cube = new RubiksCube(this->information, false);
    for (int i = 0; i < 40; i += 5) {
        const uint64_t chunk = (cornerKey >> (35 - i)) & 0b11111;
        const int corner_position = i / 5;
        const int corner_type = chunk & 0b111;
        const int orientation = (chunk & 0b11000) >> 3;
        cube->setCornerType(corner_position, corner_type, orientation);
    }
    for (int i = 0; i < 48; i += 4) {
        const uint64_t chunk = (edgeKey >> (44 - i)) & 0b1111;
        const int edge_position = i / 4;
        const int edge_type = chunk & 0b111;
        const int orientation = (chunk & 0b1000) >> 3;
        if (edge_type <= 5) {
            cube->setEdgeType(edge_position, edge_type, orientation);
        }
    }
    for (int i = 0; i < 48; i += 4) {
        uint64_t chunk = (otherEdgeKey >> (44 - i)) & 0b1111;
        int edge_position = i / 4;
        int edge_type = chunk & 0b111;
        int orientation = (chunk & 0b1000) >> 3;
        if (edge_type <= 5) {
            cube->setEdgeType(edge_position, edge_type + 6, orientation);
        }
    }
    return cube;
}

array<uint64_t, 3> RubiksCubePatternKey::fromRubiksCubeToKeys(RubiksCube & rubiksCube) {
    const uint64_t allEdgesKey = fromRubiksCubeToAllEdgesKey(rubiksCube);
    return {
        fromRubiksCubeToCornersKey(rubiksCube),
        fromAllEdgesKeyToEdgesKey(allEdgesKey),
        fromAllEdgesKeyToOtherEdgesKey(allEdgesKey)};
}

// Print corner key in binary, 5 bits at a time
void RubiksCubePatternKey::printCornerKey(uint64_t key) {
    for (int i = 0; i < 40; i += 5) {
        uint64_t chunk = (key >> (35 - i)) & 0b11111;
        std::bitset<5> bits(chunk);
        std::cout << bits.to_string() << std::endl;
    }
}

