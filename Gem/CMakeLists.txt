cmake_minimum_required(VERSION 3.16)

project(Gem VERSION 0.1 LANGUAGES CXX)

set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(QT NAMES Qt6 Qt5 REQUIRED COMPONENTS Widgets)
find_package(Qt${QT_VERSION_MAJOR} REQUIRED COMPONENTS Widgets)
find_package(Qt6 REQUIRED COMPONENTS Network)

set(PROJECT_SOURCES
    main.cpp
    mainwindow.cpp
    mainwindow.h
    mainwindow.ui
)

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/..)

if(${QT_VERSION_MAJOR} GREATER_EQUAL 6)
    qt_add_executable(Gem
        MANUAL_FINALIZATION
        ${PROJECT_SOURCES}
        suggestionpopup.cpp
        suggestionpopup.h
        mainwindow.h
        debugwindow.cpp
        debugwindow.h
        summarytext.cpp
        summarytext.h
    )
else()
    if(ANDROID)
        add_library(Gem SHARED
            ${PROJECT_SOURCES}
        )
    else()
        add_executable(Gem
            ${PROJECT_SOURCES}
        )
    endif()
endif()

target_link_libraries(Gem PRIVATE Qt${QT_VERSION_MAJOR}::Widgets)
target_link_libraries(Gem PRIVATE Qt6::Network)

# Qt for iOS sets MACOSX_BUNDLE_GUI_IDENTIFIER automatically since Qt 6.1.
if(${QT_VERSION} VERSION_LESS 6.1.0)
  set(BUNDLE_ID_OPTION MACOSX_BUNDLE_GUI_IDENTIFIER com.example.Gem)
endif()
set_target_properties(Gem PROPERTIES
    ${BUNDLE_ID_OPTION}
    MACOSX_BUNDLE_BUNDLE_VERSION ${PROJECT_VERSION}
    MACOSX_BUNDLE_SHORT_VERSION_STRING ${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}
    MACOSX_BUNDLE TRUE
    WIN32_EXECUTABLE TRUE
)

include(GNUInstallDirs)
install(TARGETS Gem
    BUNDLE DESTINATION .
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

if(QT_VERSION_MAJOR EQUAL 6)
    qt_finalize_executable(Gem)
endif()
