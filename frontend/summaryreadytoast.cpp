#include "summaryreadytoast.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPropertyAnimation>
#include <QGuiApplication>
#include <QScreen>
#include <QDesktopServices>
#include <QUrl>
#include <QPixmap>

SummaryReadyToast::SummaryReadyToast(const QString &filePath, QWidget *parent)
    : QWidget(parent), filePath(filePath) {

    setWindowFlags(Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint);
    setFixedSize(320, 120);
    setStyleSheet("background-color: #1e1e1e; border: 1px solid #444; border-radius: 8px; color: white;");

    QHBoxLayout *layout = new QHBoxLayout(this);

    iconLabel = new QLabel(this);
    iconLabel->setPixmap(QPixmap(":/assets/hadathingforyou.png").scaled(48, 48, Qt::KeepAspectRatio, Qt::SmoothTransformation));

    QVBoxLayout *textLayout = new QVBoxLayout();
    messageLabel = new QLabel("📄 Summary ready", this);
    messageLabel->setStyleSheet("color: white; font-weight: bold;");

    QHBoxLayout *buttonLayout = new QHBoxLayout();
    downloadButton = new QPushButton("Download");
    dismissButton = new QPushButton("Dismiss");

    downloadButton->setStyleSheet("color: white; background-color: #007acc; padding: 4px 12px;");
    dismissButton->setStyleSheet("color: white; background-color: #444; padding: 4px 12px;");

    connect(downloadButton, &QPushButton::clicked, this, &SummaryReadyToast::onDownloadClicked);
    connect(dismissButton, &QPushButton::clicked, this, &SummaryReadyToast::onDismissClicked);

    buttonLayout->addWidget(downloadButton);
    buttonLayout->addWidget(dismissButton);
    textLayout->addWidget(messageLabel);
    textLayout->addLayout(buttonLayout);

    layout->addWidget(iconLabel);
    layout->addLayout(textLayout);

    // Progress bar
    progressBar = new QProgressBar(this);
    progressBar->setTextVisible(false);
    progressBar->setRange(0, 100);
    progressBar->setValue(100);
    progressBar->setStyleSheet(R"(
        QProgressBar {
            background-color: transparent;
            border: none;
            height: 4px;
        }
        QProgressBar::chunk {
            background-color: #007acc;
        }
    )");

    QVBoxLayout *wrapper = new QVBoxLayout(this);
    wrapper->addLayout(layout);
    wrapper->addWidget(progressBar);
    wrapper->setContentsMargins(10, 10, 10, 10);
    setLayout(wrapper);

    // Auto-close
    autoCloseTimer = new QTimer(this);
    autoCloseTimer->setSingleShot(true);
    connect(autoCloseTimer, &QTimer::timeout, this, &SummaryReadyToast::onTimeout);
    autoCloseTimer->start(10000);

    // Animate progress bar
    QTimer *progressUpdater = new QTimer(this);
    connect(progressUpdater, &QTimer::timeout, this, [=]() {
        int elapsed = 10000 - autoCloseTimer->remainingTime();
        int value = qMax(0, 100 - (elapsed * 100 / 10000));
        progressBar->setValue(value);
    });
    progressUpdater->start(100);
}

void SummaryReadyToast::slideIn() {
    QRect screen = QGuiApplication::primaryScreen()->availableGeometry();
    int startX = screen.left() - width();
    int y = screen.bottom() - height() - 30;
    int endX = screen.left() + 20;

    move(startX, y);
    show();
    raise();
    activateWindow();

    QPropertyAnimation *animation = new QPropertyAnimation(this, "pos");
    animation->setDuration(300);
    animation->setStartValue(QPoint(startX, y));
    animation->setEndValue(QPoint(endX, y));
    animation->start();
}

void SummaryReadyToast::onDownloadClicked() {
    QDesktopServices::openUrl(QUrl::fromLocalFile(filePath));
    this->close();
}

void SummaryReadyToast::onDismissClicked() {
    this->close();
}

void SummaryReadyToast::onTimeout() {
    this->close();
}
