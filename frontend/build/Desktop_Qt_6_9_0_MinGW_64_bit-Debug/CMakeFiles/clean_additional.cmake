# Additional clean files
cmake_minimum_required(VERSION 3.16)

if("${CONFIG}" STREQUAL "" OR "${CONFIG}" STREQUAL "Debug")
  file(REMOVE_RECURSE
  "CMakeFiles\\frontend_autogen.dir\\AutogenUsed.txt"
  "CMakeFiles\\frontend_autogen.dir\\ParseCache.txt"
  "frontend_autogen"
  )
endif()
