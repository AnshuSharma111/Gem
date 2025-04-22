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
#include <QJsonDocument>
#include <QJsonObject>
#include <QJsonArray>
#include <QKeyEvent>
#include <QLabel>
#include <QLineEdit>
#include "suggestionpopup.h"
#include "debugwindow.h"

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
{
    setWindowTitle("Gem✨");

    QWidget *centralWidget = new QWidget(this);
    QVBoxLayout *mainLayout = new QVBoxLayout();

    // --- Button layout ---
    QHBoxLayout *buttonLayout = new QHBoxLayout();
    startButton = new QPushButton("Start");
    stopButton = new QPushButton("Stop");
    statusLabel = new QLabel("Status: Idle", this);

    buttonLayout->addWidget(startButton);
    buttonLayout->addWidget(stopButton);
    mainLayout->addLayout(buttonLayout);
    mainLayout->addWidget(statusLabel);

    // --- Settings Layout ---
    QWidget *settingsTab = new QWidget();
    QVBoxLayout *settingsLayout = new QVBoxLayout();

    QLabel *appLabel = new QLabel("App Blacklist:");
    appBlacklistList = new QListWidget();
    appInput = new QLineEdit();
    addAppButton = new QPushButton("Add App");
    QPushButton *removeAppButton = new QPushButton("Remove Selected App");

    QHBoxLayout *appButtonsLayout = new QHBoxLayout();
    appButtonsLayout->addWidget(addAppButton);
    appButtonsLayout->addWidget(removeAppButton);

    QLabel *winLabel = new QLabel("Window Title Blacklist:");
    windowBlacklistList = new QListWidget();
    windowInput = new QLineEdit();
    addWindowButton = new QPushButton("Add Window");
    QPushButton *removeWindowButton = new QPushButton("Remove Selected Window");

    QHBoxLayout *winButtonsLayout = new QHBoxLayout();
    winButtonsLayout->addWidget(addWindowButton);
    winButtonsLayout->addWidget(removeWindowButton);

    QLabel *label = new QLabel("Preferred Mail:", this);
    mailDropdown = new QComboBox(this);
    mailDropdown->addItems({"none", "gmail", "outlook"});

    settingsLayout->addWidget(appLabel);
    settingsLayout->addWidget(appBlacklistList);
    settingsLayout->addWidget(appInput);
    settingsLayout->addLayout(appButtonsLayout);
    settingsLayout->addWidget(winLabel);
    settingsLayout->addWidget(windowBlacklistList);
    settingsLayout->addWidget(windowInput);
    settingsLayout->addLayout(winButtonsLayout);
    settingsLayout->addWidget(label);
    settingsLayout->addWidget(mailDropdown);

    settingsTab->setLayout(settingsLayout);
    mainLayout->addWidget(settingsTab);

    // Debug window
    debugWindow = new DebugWindow(nullptr);
    debugWindow->hide();

    centralWidget->setLayout(mainLayout);
    setCentralWidget(centralWidget);

    loadSettings();

    connect(startButton, &QPushButton::clicked, this, &MainWindow::onStartClicked);
    connect(stopButton, &QPushButton::clicked, this, &MainWindow::onStopClicked);
    connect(mailDropdown, &QComboBox::currentTextChanged, this, &MainWindow::savePreference);
    connect(addAppButton, &QPushButton::clicked, this, &MainWindow::addAppToBlacklist);
    connect(addWindowButton, &QPushButton::clicked, this, &MainWindow::addWindowToBlacklist);
    connect(removeAppButton, &QPushButton::clicked, this, &MainWindow::removeSelectedApp);
    connect(removeWindowButton, &QPushButton::clicked, this, &MainWindow::removeSelectedWindow);

    QTimer *suggestionTimer = new QTimer(this);
    connect(suggestionTimer, &QTimer::timeout, this, &MainWindow::checkForSuggestion);
    suggestionTimer->start(3000);
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

            // Load blacklist
            QJsonArray apps = doc.object().value("blacklistedApps").toArray();
            for (auto a : apps) appBlacklistList->addItem(a.toString());

            QJsonArray wins = doc.object().value("blacklistedWindows").toArray();
            for (auto w : wins) windowBlacklistList->addItem(w.toString());
        }
    }
}

void MainWindow::keyPressEvent(QKeyEvent *event) {
    if (event->modifiers() == (Qt::ControlModifier | Qt::ShiftModifier) &&
        event->key() == Qt::Key_D) {
        if (debugWindow->isVisible()) {
            debugWindow->hide();
        } else {
            debugWindow->show();
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
    SuggestionPopup *popup = new SuggestionPopup(text, nullptr);

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

void MainWindow::saveBlacklistToSettings() {
    QJsonObject obj;
    obj["preferredMailMethod"] = mailDropdown->currentText();

    QJsonArray apps, windows;
    for (int i = 0; i < appBlacklistList->count(); ++i)
        apps.append(appBlacklistList->item(i)->text());

    for (int i = 0; i < windowBlacklistList->count(); ++i)
        windows.append(windowBlacklistList->item(i)->text());

    obj["blacklistedApps"] = apps;
    obj["blacklistedWindows"] = windows;

    QString path = QDir(QCoreApplication::applicationDirPath()).filePath("../../../settings.json");
    QFile file(path);
    if (file.open(QIODevice::WriteOnly)) {
        file.write(QJsonDocument(obj).toJson());
        file.close();
    }
}

void MainWindow::removeSelectedApp() {
    QListWidgetItem *item = appBlacklistList->currentItem();
    if (item) {
        delete appBlacklistList->takeItem(appBlacklistList->row(item));
        saveBlacklistToSettings();
    }
}

void MainWindow::removeSelectedWindow() {
    QListWidgetItem *item = windowBlacklistList->currentItem();
    if (item) {
        delete windowBlacklistList->takeItem(windowBlacklistList->row(item));
        saveBlacklistToSettings();
    }
}

void MainWindow::addAppToBlacklist() {
    QString app = appInput->text().trimmed();
    if (!app.isEmpty()) {
        appBlacklistList->addItem(app);
        appInput->clear();
        saveBlacklistToSettings();
    }
}

void MainWindow::addWindowToBlacklist() {
    QString win = windowInput->text().trimmed();
    if (!win.isEmpty()) {
        windowBlacklistList->addItem(win);
        windowInput->clear();
        saveBlacklistToSettings();
    }
}
