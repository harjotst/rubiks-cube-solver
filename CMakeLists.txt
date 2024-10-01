cmake_minimum_required(VERSION 3.29)
project(rubiks_cube_solver)

set(CMAKE_CXX_STANDARD 14)

add_executable(rubiks_cube_solver
    solver/solver.cpp)
