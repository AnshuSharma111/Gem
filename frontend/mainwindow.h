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

private:
    QPushButton *startButton;
    QPushButton *stopButton;
    QPushButton *settingsButton;

    QPushButton *clearButton;

    QComboBox *mailDropdown;

    QLabel *statusLabel;

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
};

#endif // MAINWINDOW_H
