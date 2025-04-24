#ifndef SUMMARYREADYTOAST_H
#define SUMMARYREADYTOAST_H

#include <QWidget>
#include <QPushButton>
#include <QLabel>
#include <QProgressBar>
#include <QTimer>

class SummaryReadyToast : public QWidget {
    Q_OBJECT

public:
    explicit SummaryReadyToast(const QString &filePath, QWidget *parent = nullptr);
    void slideIn();

private slots:
    void onDownloadClicked();
    void onDismissClicked();
    void onTimeout();

private:
    QString filePath;
    QLabel *iconLabel;
    QLabel *messageLabel;
    QPushButton *downloadButton;
    QPushButton *dismissButton;
    QProgressBar *progressBar;
    QTimer *autoCloseTimer;
};

#endif // SUMMARYREADYTOAST_H
