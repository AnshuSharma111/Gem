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
#include <QMessageBox>
#include <QMovie>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QPropertyAnimation>
#include "suggestionpopup.h"
#include "debugwindow.h"
#include "summarytext.h"

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
    loadingLabel = new QLabel("", this);
    loadingLabel->setAlignment(Qt::AlignCenter);

    buttonLayout->addWidget(startButton);
    buttonLayout->addWidget(stopButton);
    mainLayout->addLayout(buttonLayout);
    mainLayout->addWidget(statusLabel);
    mainLayout->addWidget(loadingLabel);

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

    // Start... Animation
    loadingAnimation = new QPropertyAnimation(loadingLabel, "windowOpacity", this);

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

QString MainWindow::getConfigPath(const QString &filename) {
    return QDir(QCoreApplication::applicationDirPath()).filePath("config/" + filename);
}

void MainWindow::onStartClicked() {
    QString scriptPath = QDir(QCoreApplication::applicationDirPath()).filePath("backend/utility/start-assistant.js");

    // Start backend detached
    bool success = QProcess::startDetached("node", QStringList() << scriptPath);

    if (!success) {
        QMessageBox::critical(this, "Error", "Failed to start backend process.");
        statusLabel->setText("Status: Backend start failed");
        return;
    }

    qDebug() << "Backend process started (detached)";

    // Setup loading animation text
    if (loadingTextTimer) {
        loadingTextTimer->stop();
        loadingTextTimer->deleteLater();
    }
    loadingDotCount = 0;
    loadingTextTimer = new QTimer(this);

    connect(loadingTextTimer, &QTimer::timeout, this, [=]() {
        loadingDotCount = (loadingDotCount + 1) % 4;
        QString dots(loadingDotCount, '.');
        if (loadingLabel) {
            loadingLabel->setText("Starting" + dots);
        }
    });

    loadingTextTimer->start(500);

    // Create a simple opacity animation
    if (loadingAnimation) {
        loadingAnimation->stop();
        loadingAnimation->deleteLater();
    }

    loadingAnimation = new QPropertyAnimation(loadingLabel, "windowOpacity", this);
    loadingAnimation->setDuration(1500);
    loadingAnimation->setStartValue(0.2);
    loadingAnimation->setEndValue(1.0);
    loadingAnimation->setEasingCurve(QEasingCurve::InOutSine);
    loadingAnimation->setLoopCount(-1); // infinite loop
    loadingAnimation->start();
    statusLabel->setText("Status: Starting...");

    // Start health check polling
    startHealthCheck();
}

void MainWindow::startHealthCheck() {
    if (healthCheckTimer) {
        healthCheckTimer->stop();
        healthCheckTimer->deleteLater();
    }

    int retries = 0;
    const int maxRetries = 20; // Retry 20 times = 20s timeout

    healthCheckTimer = new QTimer(this);

    connect(healthCheckTimer, &QTimer::timeout, this, [=]() mutable {
        QNetworkAccessManager *nam = new QNetworkAccessManager(this);
        QNetworkRequest req(QUrl("http://localhost:3030/health"));
        auto reply = nam->get(req);

        connect(reply, &QNetworkReply::finished, this, [=]() mutable {
            if (reply->error() == QNetworkReply::NoError) {
                // Health OK
                statusLabel->setText("Status: Running!");
                if (loadingTextTimer) {
                    loadingTextTimer->stop();
                    loadingTextTimer->deleteLater();
                    loadingTextTimer = nullptr;
                }
                loadingLabel->clear();

                healthCheckTimer->stop();
                healthCheckTimer->deleteLater();
                healthCheckTimer = nullptr;

                reply->deleteLater();
                nam->deleteLater();

                this->showMinimized();
                return;
            }

            retries++;
            if (retries >= maxRetries) {
                // Health failed after max retries
                if (loadingTextTimer) {
                    loadingTextTimer->stop();
                    loadingTextTimer->deleteLater();
                    loadingTextTimer = nullptr;
                }

                healthCheckTimer->stop();
                healthCheckTimer->deleteLater();
                healthCheckTimer = nullptr;

                statusLabel->setText("Status: Failed to start backend");
                loadingLabel->setText("Failed to Start.");
                QMessageBox::critical(this, "Error", "Backend did not become healthy in time.");
            }

            reply->deleteLater();
            nam->deleteLater();
        });
    });

    healthCheckTimer->start(1000); // Check every second
}

void MainWindow::onStopClicked() {
    QString scriptPath = QDir(QCoreApplication::applicationDirPath()).filePath("backend/utility/stop-assistant.js");

    QProcess::startDetached("node", QStringList() << scriptPath);
    statusLabel->setText("Status: Stopped");
}

void MainWindow::savePreference() {
    QString selected = mailDropdown->currentText();
    QString settingsPath = getConfigPath("settings.json");

    qDebug() << "Saving to:" << settingsPath;
    QFile file(settingsPath);
    if (file.open(QIODevice::WriteOnly)) {
        QTextStream out(&file);
        out << QString("{ \"preferredMailMethod\": \"%1\" }").arg(selected);
        file.close();
    }
}

void MainWindow::loadSettings() {
    QString settingsPath = getConfigPath("settings.json");
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
    QString path = getConfigPath("user_response.json");
    QFile file(path);
    if (file.open(QIODevice::WriteOnly)) {
        QTextStream out(&file);
        out << QString("{ \"accepted\": %1 }").arg(accepted ? "true" : "false");
        file.close();
    }
}

void MainWindow::showSuggestion(const QString &text) {
    qDebug() << "Triggering Show Suggestion";
    SuggestionPopup *popup = new SuggestionPopup(text, this);

    QStringList lines = text.split("\n");
    QString action;

    for (const QString &line : lines) {
        if (line.startsWith("Suggested Action:")) {
            action = line.section(':', 1).trimmed();
            break;
        }
    }

    connect(popup, &SuggestionPopup::accepted, this, [=]() {
        qDebug() << action;
        if (action == "summarise_pdf") {
            SummaryText *summary = new SummaryText(this);
            summary->slideIn();

            connect(summary, &SummaryText::userAccepted, this, [=]() {
                sendResponse(true);
            });

            connect(summary, &SummaryText::userRejected, this, [=]() {
                sendResponse(true);
            });
        } else {
            sendResponse(true);
        }
    });

    connect(popup, &SuggestionPopup::rejected, this, [=]() {
        sendResponse(false);
    });
}

void MainWindow::checkForSuggestion() {
    QString path = getConfigPath("latest_suggestion.json");
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

    QString path = getConfigPath("settings.json");
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
