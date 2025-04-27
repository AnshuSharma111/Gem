#ifndef SUGGESTIONPOPUP_H
#define SUGGESTIONPOPUP_H

#include <QWidget>
#include <QPushButton>
#include <QLabel>
#include <QVBoxLayout>
#include <QTimer>
#include <QString>

class SuggestionPopup : public QWidget {
    Q_OBJECT
private:
    static QList<SuggestionPopup*> activePopups;
    QTimer *dismissTimer;
    void repositionStack();

public:
    SuggestionPopup(const QString &message, QWidget *parent = nullptr);

signals:
    void accepted();
    void rejected();

private slots:
    void onAccept();
    void onReject();
};

#endif // SUGGESTIONPOPUP_H
