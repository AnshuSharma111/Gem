#ifndef SUMMARYTEXT_H
#define SUMMARYTEXT_H

#include <QWidget>
#include <QTextEdit>
#include <QPushButton>
#include <QLabel>
#include <QTimer>
#include <QPropertyAnimation>
#include <QProgressBar>

class SummaryText : public QWidget {
    Q_OBJECT

public:
    explicit SummaryText(QWidget *parent = nullptr);
    void slideIn();

signals:
    void userAccepted();
    void userRejected();

private slots:
    void onOkClicked();
    void onNoClicked();
    void onTimeout();

private:
    QLabel *label;
    QTextEdit *inputField;
    QPushButton *okButton;
    QPushButton *noButton;
    QPropertyAnimation *animation;
    QTimer *autoCloseTimer = nullptr;
    QProgressBar *progressBar;

    void writeManualSummaryResponse(bool accepted, const QString &text = "");
};

#endif // SUMMARYTEXT_H
