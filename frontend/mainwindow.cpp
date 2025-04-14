#include "mainwindow.h"
#include <QWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QDir>
#include <QDebug>
#include <QCoreApplication>
#include <QProcess>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    QWidget *centralWidget = new QWidget(this);
    QVBoxLayout *mainLayout = new QVBoxLayout();

    // Button layout
    QHBoxLayout *buttonLayout = new QHBoxLayout();
    startButton = new QPushButton("Start");
    stopButton = new QPushButton("Stop");

    buttonLayout->addWidget(startButton);
    buttonLayout->addWidget(stopButton);

    // Log area
    logArea = new QTextEdit();
    logArea->setReadOnly(true);

    // Add to main layout
    mainLayout->addLayout(buttonLayout);
    mainLayout->addWidget(logArea);

    centralWidget->setLayout(mainLayout);
    setCentralWidget(centralWidget);

    // Connect signals to slots
    connect(startButton, &QPushButton::clicked, this, &MainWindow::onStartClicked);
    connect(stopButton, &QPushButton::clicked, this, &MainWindow::onStopClicked);
}

void MainWindow::onStartClicked() {
    QString scriptPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../backend/utility/start-assistant.js");
    qDebug() << "Running:" << QDir::cleanPath(scriptPath);
    QProcess::startDetached("node", QStringList() << QDir::cleanPath(scriptPath));
}

void MainWindow::onStopClicked() {
    QString scriptPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../backend/utility/stop-assistant.js");
    qDebug() << "Running:" << QDir::cleanPath(scriptPath);
    QProcess::startDetached("node", QStringList() << QDir::cleanPath(scriptPath));
}
