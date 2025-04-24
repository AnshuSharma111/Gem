#include "summarytext.h"
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QFile>
#include <QTextStream>
#include <QDir>
#include <QScreen>
#include <QGuiApplication>
#include <QProgressBar>

SummaryText::SummaryText(QWidget *parent) : QWidget(parent) {
    setWindowFlags(Qt::FramelessWindowHint | Qt::WindowStaysOnTopHint | Qt::Dialog);
    setFixedSize(420, 240);

    // styling
    setStyleSheet(R"(
        background-color: #1e1e1e;
        border: 1px solid #444;
        border-radius: 10px;
        color: white;
    )");

    QVBoxLayout *layout = new QVBoxLayout(this);

    label = new QLabel("📝 Enter Text To Summarise:", this);
    label->setStyleSheet("color: white; font-weight: bold;");
    layout->addWidget(label);

    inputField = new QTextEdit(this);
    inputField->setStyleSheet("color: white; background-color: #2e2e2e; border: 1px solid #555;");
    layout->addWidget(inputField);

    QHBoxLayout *buttonLayout = new QHBoxLayout();
    okButton = new QPushButton("OK", this);
    noButton = new QPushButton("No", this);

    okButton->setStyleSheet("color: white; background-color: #007acc; padding: 6px 14px;");
    noButton->setStyleSheet("color: white; background-color: #444; padding: 6px 14px;");
    buttonLayout->addStretch();
    buttonLayout->addWidget(okButton);
    buttonLayout->addWidget(noButton);
    layout->addLayout(buttonLayout);

    // Timer bar
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
    layout->addWidget(progressBar);

    // Connect buttons
    connect(okButton, &QPushButton::clicked, this, &SummaryText::onOkClicked);
    connect(noButton, &QPushButton::clicked, this, &SummaryText::onNoClicked);

    // Setup countdown bar + auto timeout
    autoCloseTimer = new QTimer(this);
    autoCloseTimer->setSingleShot(true);
    connect(autoCloseTimer, &QTimer::timeout, this, &SummaryText::onTimeout);
    autoCloseTimer->start(10000);  // 10 seconds

    // Animate the progress bar
    QTimer *progressTimer = new QTimer(this);
    int duration = 10000;
    int interval = 100;
    connect(progressTimer, &QTimer::timeout, this, [=]() mutable {
        int elapsed = duration - autoCloseTimer->remainingTime();
        int value = qMax(0, 100 - (elapsed * 100 / duration));
        progressBar->setValue(value);
    });
    progressTimer->start(interval);
}

void SummaryText::slideIn() {
    QRect screenRect = QGuiApplication::primaryScreen()->availableGeometry();
    int startX = screenRect.left() - width();
    int endX = screenRect.left() + 20;
    int y = screenRect.bottom() - height() - 50;

    move(startX, y);
    show();
    raise();
    activateWindow();

    animation = new QPropertyAnimation(this, "pos");
    animation->setDuration(300);
    animation->setStartValue(QPoint(startX, y));
    animation->setEndValue(QPoint(endX, y));
    animation->start();
}

void SummaryText::onOkClicked() {
    if (autoCloseTimer) autoCloseTimer->stop();
    writeManualSummaryResponse(true, inputField->toPlainText());
    close();
    emit userAccepted();
}

void SummaryText::onNoClicked() {
    if (autoCloseTimer) autoCloseTimer->stop();
    writeManualSummaryResponse(false);
    close();
    emit userRejected();
}

void SummaryText::onTimeout() {
    writeManualSummaryResponse(false);
    close();
    emit userRejected();
}

void SummaryText::writeManualSummaryResponse(bool accepted, const QString &text) {
    QString path = QDir(QCoreApplication::applicationDirPath()).filePath("../../../config/manual_summary.json");
    QFile file(path);
    if (file.open(QIODevice::WriteOnly)) {
        QTextStream out(&file);
        out << "{ \"manual\": " << (accepted ? "true" : "false");
        if (accepted) {
            QString cleaned = text;
            cleaned.replace("\"", "\\\"").replace("\n", "\\n");
            out << ", \"text\": \"" << cleaned << "\"";
        }
        out << " }";
        file.close();
    }
}
