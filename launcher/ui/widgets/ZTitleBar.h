// SPDX-License-Identifier: GPL-3.0-only
#pragma once

#include <QWidget>

class QHBoxLayout;
class QToolButton;

/**
 * Custom window title bar for the frameless Zlauncher main window.
 * Dragging empty space moves the window, double click toggles maximize.
 */
class ZTitleBar : public QWidget {
    Q_OBJECT
   public:
    explicit ZTitleBar(QWidget* parent = nullptr);

    QHBoxLayout* contentLayout() const { return m_content; }
    void updateMaximizeButton();

   protected:
    void mousePressEvent(QMouseEvent* event) override;
    void mouseDoubleClickEvent(QMouseEvent* event) override;
    void paintEvent(QPaintEvent* event) override;

   private:
    void toggleMaximized();

    QHBoxLayout* m_content = nullptr;
    QToolButton* m_maxButton = nullptr;
};
