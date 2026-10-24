// SPDX-License-Identifier: GPL-3.0-only
#pragma once

#include <QIcon>
#include <QWidget>

/**
 * Big banner on top of the library: paints a gradient tinted after the selected
 * instance's icon with a large, faded copy of that icon as decoration.
 */
class ZHeroBanner : public QWidget {
    Q_OBJECT
   public:
    explicit ZHeroBanner(QWidget* parent = nullptr);

    void setInstanceIcon(const QIcon& icon);

   protected:
    void paintEvent(QPaintEvent* event) override;

   private:
    QIcon m_icon;
    QColor m_tint;
};
