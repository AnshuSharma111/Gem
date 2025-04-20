#ifndef DEBUGWINDOW_H
#define DEBUGWINDOW_H

#include <QWidget>
#include <QPlainTextEdit>
#include <QTimer>
#include <QPushButton>

class DebugWindow : public QWidget {
    Q_OBJECT
public:
    explicit DebugWindow(QWidget *parent = nullptr);

private slots:
    void updateLog();
    void clearLog();

private:
    QPlainTextEdit *logArea;
    QTimer *timer;
    QPushButton *clearButton;
    QString lastLogContent;
};

#endif // DEBUGWINDOW_H
