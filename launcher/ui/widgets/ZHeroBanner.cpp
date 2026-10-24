// SPDX-License-Identifier: GPL-3.0-only
#include "ZHeroBanner.h"

#include <QPainter>
#include <QPainterPath>

#include "ui/ZTheme.h"

ZHeroBanner::ZHeroBanner(QWidget* parent) : QWidget(parent), m_tint(ZTheme::AccentAlt)
{
    setObjectName("zHero");
    setMinimumHeight(230);
}

void ZHeroBanner::setInstanceIcon(const QIcon& icon)
{
    m_icon = icon;
    m_tint = ZTheme::dominantColor(icon.pixmap(64, 64).toImage());
    update();
}

void ZHeroBanner::paintEvent(QPaintEvent*)
{
    QPainter p(this);
    p.setRenderHint(QPainter::Antialiasing);
    p.setRenderHint(QPainter::SmoothPixmapTransform);

    const QRectF r = rect();
    QPainterPath shape;
    shape.addRoundedRect(r, 22, 22);
    p.setClipPath(shape);

    // base: tint fading into the shell background
    QLinearGradient base(r.topLeft(), r.bottomRight());
    base.setColorAt(0.0, m_tint.darker(115));
    base.setColorAt(0.55, m_tint.darker(260));
    base.setColorAt(1.0, ZTheme::Background);
    p.fillPath(shape, base);

    // glow blob behind the decoration
    QRadialGradient glow(QPointF(r.right() - r.height() * 0.6, r.center().y()), r.height() * 0.9);
    QColor glowColor = m_tint.lighter(140);
    glowColor.setAlpha(110);
    glow.setColorAt(0, glowColor);
    glow.setColorAt(1, Qt::transparent);
    p.fillRect(r, glow);

    // large tilted copy of the icon on the right
    if (!m_icon.isNull()) {
        const int side = int(r.height() * 1.15);
        QPixmap pix = m_icon.pixmap(side, side);
        p.save();
        p.translate(r.right() - side * 0.45, r.center().y());
        p.rotate(-12);
        p.setOpacity(0.28);
        p.drawPixmap(QRectF(-side / 2.0, -side / 2.0, side, side), pix, pix.rect());
        p.restore();
    }

    // diagonal stripes for some texture
    p.setPen(QPen(QColor(255, 255, 255, 10), 18));
    for (int x = -int(r.height()); x < r.width(); x += 46)
        p.drawLine(QPointF(x, r.bottom()), QPointF(x + r.height(), r.top()));

    // darken the left side so text always reads
    QLinearGradient shade(r.topLeft(), r.topRight());
    shade.setColorAt(0, QColor(0, 0, 0, 110));
    shade.setColorAt(0.6, QColor(0, 0, 0, 0));
    p.fillRect(r, shade);

    p.setClipping(false);
    p.setPen(QPen(QColor(255, 255, 255, 30), 1));
    p.drawPath(shape);
}
