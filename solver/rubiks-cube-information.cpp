//
// Created by Harjot Tathgur on 2024-09-27.
//

#include "rubiks-cube-information.h"

#include <iostream>
#include <fstream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

RubiksCubeInformation::RubiksCubeInformation(const string &cornerFaceProductToTypePath,
                                             const string &edgeFaceProductToTypePath,
                                             const string &cornerPositionToIndicesPath,
                                             const string &edgePositionToIndicesPath,
                                             const string &cornerOrientationForCornerTypeAndPositionPath,
                                             const string &edgeOrientationForEdgeTypeAndPositionPath,
                                             const string &oppositeMovetoMovePath) {
    const json cornerFaceProductToTypePathJson = json::parse(fstream(cornerFaceProductToTypePath));

    for (auto &[key, value]: cornerFaceProductToTypePathJson.items()) {
        auto keyUint = static_cast<int>(stoi(key)), valueUint = static_cast<int>(value);

        cornerFaceProductToType[keyUint] = valueUint;
    }

    const json edgeFaceProductToTypePathJson = json::parse(fstream(edgeFaceProductToTypePath));

    for (auto &[key, value]: edgeFaceProductToTypePathJson.items()) {
        auto keyUint = static_cast<int>(stoi(key)), valueUint = static_cast<int>(value);

        edgeFaceProductToType[keyUint] = valueUint;
    }

    const json cornerPositionToIndicesJson = json::parse(fstream(cornerPositionToIndicesPath));

    for (auto &[key, value]: cornerPositionToIndicesJson.items()) {
        auto keyUint = static_cast<int>(stoi(key));

        cornerPositionToIndices[keyUint] = value;
    }

    const json edgePositionToIndicesJson = json::parse(fstream(edgePositionToIndicesPath));

    for (auto &[key, value]: edgePositionToIndicesJson.items()) {
        auto keyUint = static_cast<int>(stoi(key));

        edgePositionToIndices[keyUint] = value;
    }

    const json cornerOrientationForCornerTypeAndPositionJson =
            json::parse(fstream(cornerOrientationForCornerTypeAndPositionPath));

    for (auto &[cornerType, positionToOrientations]: cornerOrientationForCornerTypeAndPositionJson.items()) {
        auto cornerTypeUint = static_cast<int>(stoi(cornerType));

        cornerOrientationForCornerTypeAndPosition[cornerTypeUint] = unordered_map<int, vector<vector<int>>>();

        for (auto &[cornerPosition, orientation]: positionToOrientations.items()) {
            auto cornerPositionUint = static_cast<int>(stoi(cornerPosition));

            cornerOrientationForCornerTypeAndPosition[cornerTypeUint][cornerPositionUint] = orientation;
        }
    }

    const json edgeOrientationForEdgeTypeAndPositionJson =
            json::parse(fstream(edgeOrientationForEdgeTypeAndPositionPath));

    for (auto &[cornerType, positionToOrientations]: edgeOrientationForEdgeTypeAndPositionJson.items()) {
        auto edgeTypeUint = static_cast<int>(stoi(cornerType));

        edgeOrientationForEdgeTypeAndPosition[edgeTypeUint] = unordered_map<int, vector<vector<int>>>();

        for (auto &[cornerPosition, orientation]: positionToOrientations.items()) {
            auto cornerPositionUint = static_cast<int>(stoi(cornerPosition));

            edgeOrientationForEdgeTypeAndPosition[edgeTypeUint][cornerPositionUint] = orientation;
        }
    }

    const json oppositeMovetoMoveJson = json::parse(fstream(oppositeMovetoMovePath));

    oppositeMovetoMove = oppositeMovetoMoveJson;
}

void RubiksCubeInformation::printMap(const unordered_map<int, int> &map) {
    cout << "{\n";
    for (const auto &[key, value]: map) {
        cout << "    {" << static_cast<int>(key) << ", " << static_cast<int>(value) << "},\n";
    }
    cout << "}\n";
}

void RubiksCubeInformation::printNestedMap(const unordered_map<int, vector<vector<int>>> &map) {
    cout << "{\n";
    for (const auto &[key, nestedVec]: map) {
        cout << "    {" << static_cast<int>(key) << ": [";
        for (const auto &innerVec: nestedVec) {
            cout << "[";
            for (const auto &val: innerVec) {
                cout << static_cast<int>(val) << ", ";
            }
            cout << "], ";
        }
        cout << "]},\n";
    }
    cout << "}\n";
}

void RubiksCubeInformation::printDoubleNestedMap(
        const unordered_map<int, unordered_map<int, vector<vector<int>>>> &map) {
    cout << "{\n";
    for (const auto &[key, innerMap]: map) {
        cout << "    {" << static_cast<int>(key) << ": {\n";
        for (const auto &[innerKey, nestedVec]: innerMap) {
            cout << "        {" << static_cast<int>(innerKey) << ": [";
            for (const auto &vec: nestedVec) {
                cout << "[";
                for (const auto &val: vec) {
                    cout << static_cast<int>(val) << ", ";
                }
                cout << "], ";
            }
            cout << "]},\n";
        }
        cout << "    }},\n";
    }
    cout << "}\n";
}
