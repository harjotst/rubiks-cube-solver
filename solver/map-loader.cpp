#include "map-loader.h"
#include <tbb/parallel_for.h>
#include <tbb/blocked_range.h>
#include <fstream>
#include <iostream>
#include <chrono>
#include <thread>
#include <functional> // For ref

using namespace std;
using namespace tbb;

// Constructor
MapLoader::MapLoader(
    tuple<string, size_t> movesToSolvedCornersInfo,
    tuple<string, size_t> movesToSolvedEdgesInfo,
    tuple<string, size_t> movesToOtherSolvedEdgesInfo)
    : movesToSolvedCornersInfo(movesToSolvedCornersInfo),
        movesToSolvedEdgesInfo(movesToSolvedEdgesInfo),
        movesToOtherSolvedEdgesInfo(movesToOtherSolvedEdgesInfo)  {}

// Method to load a map from a file
void MapLoader::loadMapFromFile(const string& filename, unordered_map<uint64_t, int> & my_map,
    const size_t reserve_size) {
    auto start_time = chrono::high_resolution_clock::now();

    // Reserve space in the map
    my_map.reserve(reserve_size);

    ifstream file(filename);
    if (!file.is_open()) {
        cerr << "Error: Unable to open file '" << filename << "'\n";
        return;
    }

    uint64_t key;
    uint16_t value;

    while (file >> key >> value) {
        my_map.insert({ key, value });
    }
    file.close();

    auto end_time = chrono::high_resolution_clock::now();
    chrono::duration<double> duration = end_time - start_time;

    cout << "Loaded map from '" << filename << "' in "
         << duration.count() << " seconds\n";
}

// Method to load multiple maps concurrently
void MapLoader::loadMapsConcurrently() {
    maps.resize(3);

    // Create threads for each file
    vector<thread> threads;

    threads.emplace_back(&MapLoader::loadMapFromFile, this, get<0>(movesToSolvedCornersInfo), ref(maps[0]),
                         get<1>(movesToSolvedCornersInfo));
    threads.emplace_back(&MapLoader::loadMapFromFile, this, get<0>(movesToSolvedEdgesInfo), ref(maps[1]),
                         get<1>(movesToSolvedEdgesInfo));
    threads.emplace_back(&MapLoader::loadMapFromFile, this, get<0>(movesToOtherSolvedEdgesInfo), ref(maps[2]),
                         get<1>(movesToOtherSolvedEdgesInfo));

    // Wait for all threads to finish
    for (auto &t: threads) {
        if (t.joinable()) {
            t.join();
        }
    }
}

vector<unordered_map<uint64_t, int>> & MapLoader::retrieveMaps() {
    return maps;
}