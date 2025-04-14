#include "mainwindow.h"
#include <QWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QDir>
#include <QDebug>
#include <QCoreApplication>
#include <QProcess>
#include <QTimer>
#include <QFile>
#include <QTextStream>
#include <QScrollBar>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    QWidget *centralWidget = new QWidget(this);
    QVBoxLayout *mainLayout = new QVBoxLayout();

    // Button layout
    QHBoxLayout *buttonLayout = new QHBoxLayout();
    startButton = new QPushButton("Start");
    stopButton = new QPushButton("Stop");
    clearButton = new QPushButton("Clear", this);

    buttonLayout->addWidget(startButton);
    buttonLayout->addWidget(stopButton);
    buttonLayout->addWidget(clearButton);

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
    connect(clearButton, &QPushButton::clicked, this, &MainWindow::onClearClicked);

    // Set up a timer to refresh logs every 2 seconds
    QTimer *logTimer = new QTimer(this);
    connect(logTimer, &QTimer::timeout, this, &MainWindow::updateLogArea);
    logTimer->start(2000);  // 2000ms = 2s
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

void MainWindow::onClearClicked() {
    QString logPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../debug.log");
    QFile file(QDir::cleanPath(logPath));

    if (file.exists()) {
        if (file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
            file.close();
            logArea->clear();
            lastLogText.clear();
        } else {
            logArea->setPlainText("⚠️ Failed to clear log file.");
        }
    } else {
        logArea->setPlainText("Log file not found.");
    }
}

void MainWindow::updateLogArea() {
    QString logPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../debug.log");
    QFile file(QDir::cleanPath(logPath));

    if (!file.exists()) {
        logArea->setPlainText("Log file not found.");
        return;
    }

    if (file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QTextStream in(&file);
        QString currentLog = in.readAll();
        file.close();

        // Compare with previous logs
        if (currentLog != lastLogText) {
            QScrollBar *scrollBar = logArea->verticalScrollBar();
            bool isAtBottom = scrollBar->value() == scrollBar->maximum();

            // Only add new portion
            QString newText = currentLog.mid(lastLogText.length());
            logArea->moveCursor(QTextCursor::End);
            logArea->insertPlainText(newText);

            if (isAtBottom) {
                scrollBar->setValue(scrollBar->maximum());
            }

            lastLogText = currentLog;
        }
    }
}
