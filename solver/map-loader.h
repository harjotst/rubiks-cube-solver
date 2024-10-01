#ifndef MAP_LOADER_H
#define MAP_LOADER_H

#include <string>
#include <vector>
#include <unordered_map>
#include <cstdint>
#include <tuple>

using namespace std;

class MapLoader
{
public:
    // Constructor
    MapLoader(tuple<string, size_t> movesToSolvedCornersInfo,
        tuple<string, size_t> movesToSolvedEdgesInfo,
        tuple<string, size_t> movesToOtherSolvedEdgesInfo);

    // Method to load multiple maps concurrently
    void loadMapsConcurrently();

    vector<unordered_map<uint64_t, int>> & retrieveMaps();

private:
    // file names to heuristics and their # of lines in each file
    tuple<string, size_t> movesToSolvedCornersInfo;
    tuple<string, size_t> movesToSolvedEdgesInfo;
    tuple<string, size_t> movesToOtherSolvedEdgesInfo;

    // Method to load a map from a file
    void loadMapFromFile(const string& filename, unordered_map<uint64_t, int>& my_map,
        size_t reserve_size);

    // Vector to hold the maps
    vector<unordered_map<uint64_t, int>> maps;

    // Helper method to read data from a file
    vector<pair<uint64_t, int>> readDataFromFile(const string& filename);

    // Helper method to insert data into the map concurrently
    void insertDataIntoMap(const vector<pair<uint64_t, int>>& data,
        unordered_map<uint64_t, int>& my_map);
};

#endif // MAP_LOADER_H
