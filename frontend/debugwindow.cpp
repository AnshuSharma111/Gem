#include "debugwindow.h"
#include <QVBoxLayout>
#include <QDir>
#include <QFile>
#include <QTextStream>
#include <QScrollBar>
#include <QCoreApplication>

DebugWindow::DebugWindow(QWidget *parent) : QWidget(parent) {
    QVBoxLayout *layout = new QVBoxLayout(this);

    logArea = new QPlainTextEdit(this);
    logArea->setReadOnly(true);

    clearButton = new QPushButton("Clear Log", this);
    connect(clearButton, &QPushButton::clicked, this, &DebugWindow::clearLog);

    layout->addWidget(logArea);
    layout->addWidget(clearButton);

    setLayout(layout);
    setWindowTitle("Debug Log Viewer");
    resize(600, 400);

    timer = new QTimer(this);
    connect(timer, &QTimer::timeout, this, &DebugWindow::updateLog);
    timer->start(2000);
}

void DebugWindow::updateLog() {
    QString logPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../debug.log");
    QFile file(logPath);

    if (!file.exists())
        return;

    if (file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QTextStream in(&file);
        QString content = in.readAll();
        file.close();

        if (content != lastLogContent) {
            logArea->setPlainText(content);
            logArea->verticalScrollBar()->setValue(logArea->verticalScrollBar()->maximum());
            lastLogContent = content;
        }
    }
}

void DebugWindow::clearLog() {
    QString logPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../debug.log");
    QFile file(QDir::cleanPath(logPath));

    if (file.exists()) {
        if (file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
            file.close();
            logArea->clear();
            lastLogContent.clear();
        }
    }
}
