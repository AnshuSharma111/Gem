#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QPushButton>
#include <QTextEdit>
#include <QComboBox>
#include <QTabWidget>
#include <QKeyEvent>
#include <QListWidget>
#include <QLabel>
#include <QPropertyAnimation>
#include "debugwindow.h"

class MainWindow : public QMainWindow {
    Q_OBJECT

protected:
    void keyPressEvent(QKeyEvent *event) override;

public:
    MainWindow(QWidget *parent = nullptr);

private slots:
    void onStartClicked();
    void onStopClicked();
    void savePreference();
    void showSuggestion(const QString &text);
    void sendResponse(bool accepted);
    void checkForSuggestion();
    void removeSelectedApp();
    void removeSelectedWindow();
    QString getConfigPath(const QString& filename);

private:
    QPushButton *startButton;
    QPushButton *stopButton;
    QPushButton *settingsButton;

    QPushButton *clearButton;

    QComboBox *mailDropdown;

    QLabel *statusLabel;
    QLabel *loadingLabel;

    QTabWidget *tabWidget;
    DebugWindow *debugWindow;

    QListWidget *appBlacklistList;
    QListWidget *windowBlacklistList;
    QLineEdit *appInput;
    QLineEdit *windowInput;
    QPushButton *addAppButton;
    QPushButton *addWindowButton;

    void loadBlacklistFromSettings();
    void saveBlacklistToSettings();
    void addAppToBlacklist();
    void addWindowToBlacklist();
    int debugTabIndex;

    void loadSettings();

    QTimer* healthCheckTimer = nullptr;
    void startHealthCheck();
    QTimer* loadingTextTimer = nullptr;
    int loadingDotCount = 0;

    QPropertyAnimation *loadingAnimation;
};

#endif // MAINWINDOW_H
