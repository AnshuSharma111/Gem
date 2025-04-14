#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include <QPushButton>
#include <QTextEdit>

class MainWindow : public QMainWindow {
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr);

private slots:
    void onStartClicked();
    void onStopClicked();
    void updateLogArea();
    void onClearClicked();

private:
    QPushButton *startButton;
    QPushButton *stopButton;
    QTextEdit *logArea;
    QString lastLogText;
    QPushButton *clearButton;
};

#endif // MAINWINDOW_H
