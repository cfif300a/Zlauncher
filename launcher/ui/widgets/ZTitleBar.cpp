// SPDX-License-Identifier: GPL-3.0-only
#include "ZTitleBar.h"

#include <QHBoxLayout>
#include <QMouseEvent>
#include <QPainter>
#include <QStyleOption>
#include <QToolButton>
#include <QWindow>

ZTitleBar::ZTitleBar(QWidget* parent) : QWidget(parent)
{
    setObjectName("zTitleBar");
    setAttribute(Qt::WA_StyledBackground, true);
    setFixedHeight(56);

    auto layout = new QHBoxLayout(this);
    layout->setContentsMargins(16, 0, 6, 0);
    layout->setSpacing(6);

    m_content = new QHBoxLayout();
    m_content->setContentsMargins(0, 0, 0, 0);
    m_content->setSpacing(6);
    layout->addLayout(m_content, 1);

    auto makeWinButton = [this, layout](const QString& name, const QString& glyph) {
        auto btn = new QToolButton(this);
        btn->setObjectName(name);
        btn->setText(glyph);
        btn->setFocusPolicy(Qt::NoFocus);
        btn->setFixedSize(40, 32);
        layout->addWidget(btn);
        return btn;
    };

    auto minButton = makeWinButton("zWinMin", QStringLiteral("—"));
    m_maxButton = makeWinButton("zWinMax", QStringLiteral("☐"));
    auto closeButton = makeWinButton("zWinClose", QStringLiteral("✕"));

    connect(minButton, &QToolButton::clicked, this, [this] { window()->showMinimized(); });
    connect(m_maxButton, &QToolButton::clicked, this, &ZTitleBar::toggleMaximized);
    connect(closeButton, &QToolButton::clicked, this, [this] { window()->close(); });
}

void ZTitleBar::toggleMaximized()
{
    if (window()->isMaximized())
        window()->showNormal();
    else
        window()->showMaximized();
}

void ZTitleBar::updateMaximizeButton()
{
    m_maxButton->setText(window()->isMaximized() ? QStringLiteral("❐") : QStringLiteral("☐"));
}

void ZTitleBar::mousePressEvent(QMouseEvent* event)
{
    if (event->button() == Qt::LeftButton && window()->windowHandle()) {
        window()->windowHandle()->startSystemMove();
        event->accept();
        return;
    }
    QWidget::mousePressEvent(event);
}

void ZTitleBar::mouseDoubleClickEvent(QMouseEvent* event)
{
    if (event->button() == Qt::LeftButton) {
        toggleMaximized();
        event->accept();
        return;
    }
    QWidget::mouseDoubleClickEvent(event);
}

void ZTitleBar::paintEvent(QPaintEvent*)
{
    QStyleOption opt;
    opt.initFrom(this);
    QPainter p(this);
    style()->drawPrimitive(QStyle::PE_Widget, &opt, &p, this);
}
