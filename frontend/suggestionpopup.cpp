#include "SuggestionPopup.h"
#include <QApplication>
#include <QScreen>
#include <QPropertyAnimation>
#include <QEasingCurve>
#include <QGuiApplication>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QLabel>
#include <QPushButton>

SuggestionPopup::SuggestionPopup(const QString &message, QWidget *parent)
    : QWidget(parent, Qt::FramelessWindowHint | Qt::Tool | Qt::WindowStaysOnTopHint)
{
    setAttribute(Qt::WA_TranslucentBackground);

    // Dark theme styling
    setStyleSheet("background-color: #2e2e2e; border: 1px solid #444; border-radius: 10px; padding: 10px;");

    QVBoxLayout *layout = new QVBoxLayout(this);
    layout->setContentsMargins(15, 15, 15, 15);
    layout->setSpacing(10);

    // Label
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
    buttonLayout->addStretch();  // Push buttons to the right
    buttonLayout->addWidget(acceptBtn);
    buttonLayout->addWidget(rejectBtn);
    buttonLayout->setSpacing(10);
    layout->addLayout(buttonLayout);

    connect(acceptBtn, &QPushButton::clicked, this, &SuggestionPopup::onAccept);
    connect(rejectBtn, &QPushButton::clicked, this, &SuggestionPopup::onReject);

    adjustSize(); // Layout must be finalized before positioning

    // Position setup
    QScreen *screen = QGuiApplication::primaryScreen();
    QRect screenGeometry = screen->availableGeometry();
    int finalX = screenGeometry.right() - width() - 20;
    int finalY = screenGeometry.bottom() - height() - 20;
    int startX = screenGeometry.right() + 10; // off-screen start
    int startY = finalY;

    move(startX, startY); // Start off-screen
    show(); // Needed before animating

    // Slide-in animation
    QPropertyAnimation *animation = new QPropertyAnimation(this, "pos");
    animation->setDuration(400);
    animation->setStartValue(QPoint(startX, startY));
    animation->setEndValue(QPoint(finalX, finalY));
    animation->setEasingCurve(QEasingCurve::OutCubic);
    animation->start(QAbstractAnimation::DeleteWhenStopped);
}

void SuggestionPopup::onAccept() {
    emit accepted();
    close();
}

void SuggestionPopup::onReject() {
    emit rejected();
    close();
}
