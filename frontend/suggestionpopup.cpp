#include "suggestionpopup.h"
#include <QPropertyAnimation>
#include <QEasingCurve>
#include <QScreen>
#include <QGuiApplication>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>
#include <QTimer>
#include <QFrame>

SuggestionPopup::SuggestionPopup(const QString &message, QWidget *parent)
    : QWidget(parent, Qt::FramelessWindowHint | Qt::Tool | Qt::WindowStaysOnTopHint)
{
    setAttribute(Qt::WA_TranslucentBackground);

    // Dark theme styling
    setStyleSheet("background-color: #2e2e2e; border: 1px solid #444; border-radius: 10px; padding: 10px;");

    QVBoxLayout *layout = new QVBoxLayout(this);
    layout->setContentsMargins(15, 15, 10, 10);
    layout->setSpacing(10);

    // Countdown progress bar (shrinking blue line)
    QFrame *progressBar = new QFrame(this);
    progressBar->setFixedHeight(4);
    progressBar->setStyleSheet("background-color: #007bff; border-radius: 2px;");
    layout->addWidget(progressBar);

    // Message label
    QLabel *label = new QLabel(message, this);
    label->setWordWrap(true);
    label->setMaximumWidth(300);
    label->setStyleSheet("color: #f0f0f0; font-size: 14px;");
    layout->addWidget(label);

    // Buttons
    QPushButton *acceptBtn = new QPushButton("Accept", this);
    QPushButton *rejectBtn = new QPushButton("Reject", this);

    QString btnStyle = "QPushButton {"
                       "background-color: #444;"
                       "color: #f0f0f0;"
                       "border: none;"
                       "border-radius: 6px;"
                       "padding: 6px 12px;"
                       "font-size: 13px;"
                       "}"
                       "QPushButton:hover {"
                       "background-color: #555;"
                       "}";

    acceptBtn->setStyleSheet(btnStyle);
    rejectBtn->setStyleSheet(btnStyle);
    acceptBtn->setFixedWidth(100);
    rejectBtn->setFixedWidth(100);

    QHBoxLayout *buttonLayout = new QHBoxLayout();
    buttonLayout->addStretch();
    buttonLayout->addWidget(acceptBtn);
    buttonLayout->addWidget(rejectBtn);
    buttonLayout->setSpacing(10);
    layout->addLayout(buttonLayout);

    connect(acceptBtn, &QPushButton::clicked, this, &SuggestionPopup::onAccept);
    connect(rejectBtn, &QPushButton::clicked, this, &SuggestionPopup::onReject);

    adjustSize();

    // Position
    QScreen *screen = QGuiApplication::primaryScreen();
    QRect screenGeometry = screen->availableGeometry();
    int finalX = screenGeometry.right() - width() - 20;
    int finalY = screenGeometry.bottom() - height() - 20;
    int startX = screenGeometry.right() + 10;
    int startY = finalY;

    move(startX, startY);
    show();

    // Slide-in animation
    QPropertyAnimation *slideAnim = new QPropertyAnimation(this, "pos");
    slideAnim->setDuration(400);
    slideAnim->setStartValue(QPoint(startX, startY));
    slideAnim->setEndValue(QPoint(finalX, finalY));
    slideAnim->setEasingCurve(QEasingCurve::OutCubic);
    slideAnim->start(QAbstractAnimation::DeleteWhenStopped);

    // Shrinking progress bar animation
    QPropertyAnimation *barAnim = new QPropertyAnimation(progressBar, "maximumWidth");
    barAnim->setDuration(15000); // 15 seconds
    barAnim->setStartValue(progressBar->width());
    barAnim->setEndValue(0);
    barAnim->setEasingCurve(QEasingCurve::Linear);
    barAnim->start(QAbstractAnimation::DeleteWhenStopped);

    // Auto-dismiss timer
    QTimer::singleShot(15000, this, &SuggestionPopup::onReject);
}

void SuggestionPopup::onAccept() {
    emit accepted();
    close();
}

void SuggestionPopup::onReject() {
    emit rejected();
    close();
}
