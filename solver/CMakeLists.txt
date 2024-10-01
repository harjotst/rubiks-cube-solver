cmake_minimum_required(VERSION 3.29)
project(solver)

set(CMAKE_CXX_STANDARD 23)

# FetchContent is available in CMake 3.14+
include(FetchContent)

# Fetch nlohmann/json
FetchContent_Declare(
        json
        GIT_REPOSITORY https://github.com/nlohmann/json.git
        GIT_TAG v3.11.2 # Replace with the latest version
)

FetchContent_MakeAvailable(json)

# Find the TBB package
find_package(TBB REQUIRED)

# Add the executable
add_executable(main solver.cpp
        rubiks-cube-information.h
        rubiks-cube-information.cpp
        rubiks-cube.cpp
        rubiks-cube.h
        rubiks-cube-pattern-key.cpp
        rubiks-cube-pattern-key.h
        map-loader.cpp
        map-loader.h
        rubiks-cube-solver.cpp
        rubiks-cube-solver.h)

# Link the json library to your project
target_link_libraries(main PRIVATE nlohmann_json::nlohmann_json)

# Link the TBB library
target_link_libraries(main PRIVATE TBB::tbb)
