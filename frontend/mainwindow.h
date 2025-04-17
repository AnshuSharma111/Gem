#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QPushButton>
#include <QTextEdit>
#include <QComboBox>
#include <QTabWidget>
#include <QKeyEvent>
#include <QLabel>

class MainWindow : public QMainWindow {
    Q_OBJECT

protected:
    void keyPressEvent(QKeyEvent *event) override;

public:
    MainWindow(QWidget *parent = nullptr);

private slots:
    void onStartClicked();
    void onStopClicked();
    void onClearClicked();
    void updateLogArea();
    void savePreference();
    void showSuggestion(const QString &text);
    void sendResponse(bool accepted);
    void checkForSuggestion();

private:
    QPushButton *startButton;
    QPushButton *stopButton;
    QPushButton *settingsButton;

    QTextEdit *logArea;
    QPushButton *clearButton;

    QComboBox *mailDropdown;
    QString lastLogText;

    QLabel *statusLabel;

    QTabWidget *tabWidget;
    QWidget *debugTab;
    int debugTabIndex;

    void loadSettings();
};

#endif // MAINWINDOW_H
