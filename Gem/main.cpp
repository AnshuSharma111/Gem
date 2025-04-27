#include <QApplication>
#include "mainwindow.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    app.setWindowIcon(QIcon("./gem_icon.png"));
    QCoreApplication::setApplicationName("Gem✨");
    QCoreApplication::setOrganizationName("Keyboard Studios");

    MainWindow window;
    window.resize(500, 400); // Windowed size
    window.show();

    return app.exec();
}
