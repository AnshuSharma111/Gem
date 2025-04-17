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
#include <QTabWidget>
#include <QJsonDocument>
#include <QJsonObject>
#include <QKeyEvent>
#include <QLabel>
#include "suggestionpopup.h"

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    QWidget *centralWidget = new QWidget(this);
    QVBoxLayout *mainLayout = new QVBoxLayout();

    // --- Button layout ---
    QHBoxLayout *buttonLayout = new QHBoxLayout();
    startButton = new QPushButton("Start");
    stopButton = new QPushButton("Stop");
    settingsButton = new QPushButton("Settings");
    statusLabel = new QLabel("Status: Idle", this);

    buttonLayout->addWidget(startButton);
    buttonLayout->addWidget(stopButton);
    buttonLayout->addWidget(settingsButton);
    mainLayout->addLayout(buttonLayout);
    mainLayout->addWidget(statusLabel);

    // --- Tabs ---
    tabWidget = new QTabWidget(this);

    // Settings Tab
    QWidget *settingsTab = new QWidget();
    QVBoxLayout *settingsLayout = new QVBoxLayout();
    QLabel *label = new QLabel("Preferred Mail:", this);
    mailDropdown = new QComboBox(this);
    mailDropdown->addItems({"none", "gmail", "outlook"});
    settingsLayout->addWidget(label);
    settingsLayout->addWidget(mailDropdown);
    settingsTab->setLayout(settingsLayout);
    tabWidget->addTab(settingsTab, "Settings");

    // Debug Tab (initially hidden)
    debugTab = new QWidget();
    QVBoxLayout *debugLayout = new QVBoxLayout();
    logArea = new QTextEdit();
    logArea->setReadOnly(true);
    clearButton = new QPushButton("Clear Logs");
    debugLayout->addWidget(logArea);
    debugLayout->addWidget(clearButton);
    debugTab->setLayout(debugLayout);
    debugTabIndex = tabWidget->addTab(debugTab, "Debug");
    tabWidget->removeTab(debugTabIndex);  // hide initially

    mainLayout->addWidget(tabWidget);
    centralWidget->setLayout(mainLayout);
    setCentralWidget(centralWidget);

    // Load saved preference
    loadSettings();

    // Connections
    connect(startButton, &QPushButton::clicked, this, &MainWindow::onStartClicked);
    connect(stopButton, &QPushButton::clicked, this, &MainWindow::onStopClicked);
    connect(mailDropdown, &QComboBox::currentTextChanged, this, &MainWindow::savePreference);
    connect(clearButton, &QPushButton::clicked, this, &MainWindow::onClearClicked);

    // Timer for log refresh
    QTimer *logTimer = new QTimer(this);
    connect(logTimer, &QTimer::timeout, this, &MainWindow::updateLogArea);
    logTimer->start(2000); // every 2 seconds

    // Timer to check fornew suggestions
    QTimer *suggestionTimer = new QTimer(this);
    connect(suggestionTimer, &QTimer::timeout, this, &MainWindow::checkForSuggestion);
    suggestionTimer->start(3000); // every 3 seconds
}

void MainWindow::onStartClicked() {
    QString scriptPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../backend/utility/start-assistant.js");
    QProcess::startDetached("node", QStringList() << QDir::cleanPath(scriptPath));
    statusLabel->setText("Status: Running...");
    this->showMinimized();
}

void MainWindow::onStopClicked() {
    QString scriptPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../backend/utility/stop-assistant.js");
    statusLabel->setText("Status: Stopped");
    QProcess::startDetached("node", QStringList() << QDir::cleanPath(scriptPath));
}

void MainWindow::savePreference() {
    QString selected = mailDropdown->currentText();
    QString settingsPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../settings.json");

    qDebug() << "Saving to:" << settingsPath;
    QFile file(settingsPath);
    if (file.open(QIODevice::WriteOnly)) {
        QTextStream out(&file);
        out << QString("{ \"preferredMailMethod\": \"%1\" }").arg(selected);
        file.close();
    }
}

void MainWindow::loadSettings() {
    QString settingsPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../settings.json");
    QFile file(settingsPath);
    if (file.open(QIODevice::ReadOnly)) {
        QString json = file.readAll();
        file.close();
        QJsonDocument doc = QJsonDocument::fromJson(json.toUtf8());
        if (doc.isObject()) {
            QString pref = doc.object().value("preferredMailMethod").toString();
            int index = mailDropdown->findText(pref);
            if (index >= 0) mailDropdown->setCurrentIndex(index);
        }
    }
}

void MainWindow::onClearClicked() {
    QString logPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../debug.log");
    QFile file(QDir::cleanPath(logPath));

    if (file.exists()) {
        if (file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
            file.close();
            logArea->clear();
            lastLogText.clear();
        }
    }
}

void MainWindow::updateLogArea() {
    QString logPath = QDir(QCoreApplication::applicationDirPath()).filePath("../../../debug.log");
    QFile file(QDir::cleanPath(logPath));

    if (!file.exists()) {
        return;
    }

    if (file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QTextStream in(&file);
        QString currentLog = in.readAll();
        file.close();

        if (currentLog != lastLogText) {
            QScrollBar *scrollBar = logArea->verticalScrollBar();
            bool isAtBottom = scrollBar->value() == scrollBar->maximum();

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

void MainWindow::keyPressEvent(QKeyEvent *event) {
    if (event->modifiers() == (Qt::ControlModifier | Qt::ShiftModifier) &&
        event->key() == Qt::Key_D) {
        if (tabWidget->indexOf(debugTab) == -1) {
            debugTabIndex = tabWidget->addTab(debugTab, "Debug");
        } else {
            tabWidget->removeTab(debugTabIndex);
        }
    }
}
void MainWindow::sendResponse(bool accepted) {
    QString path = QDir(QCoreApplication::applicationDirPath()).filePath("../../../user_response.json");
    QFile file(path);
    if (file.open(QIODevice::WriteOnly)) {
        QTextStream out(&file);
        out << QString("{ \"accepted\": %1 }").arg(accepted ? "true" : "false");
        file.close();
    }
}

void MainWindow::showSuggestion(const QString &text) {
    SuggestionPopup *popup = new SuggestionPopup(text, this);

    connect(popup, &SuggestionPopup::accepted, this, [=]() {
        sendResponse(true);
    });

    connect(popup, &SuggestionPopup::rejected, this, [=]() {
        sendResponse(false);
    });
}

void MainWindow::checkForSuggestion() {
    QString path = QDir(QCoreApplication::applicationDirPath()).filePath("../../../latest_suggestion.json");
    QFile file(path);

    if (!file.exists()) return;

    if (file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QTextStream in(&file);
        QString json = in.readAll();
        file.close();

        QJsonDocument doc = QJsonDocument::fromJson(json.toUtf8());
        if (!doc.isObject()) return;

        QString action = doc["action"].toString();
        QString reason = doc["reason"].toString();

        QString message = QString("Suggested Action: %1\n\nReason: %2").arg(action, reason);
        showSuggestion(message);

        file.remove(); // Prevent repeat trigger
    }
}
