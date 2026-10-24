// SPDX-License-Identifier: GPL-3.0-only
/*
 *  Prism Launcher - Minecraft Launcher
 *  Copyright (C) 2022 Sefa Eyeoglu <contact@scrumplex.net>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, version 3.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * This file incorporates work covered by the following copyright and
 * permission notice:
 *
 *      Copyright 2013-2021 MultiMC Contributors
 *
 *      Licensed under the Apache License, Version 2.0 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

#include "InstanceDelegate.h"
#include <QApplication>
#include <QDebug>
#include <QPainter>
#include <QPainterPath>
#include <QTextLayout>
#include <QTextOption>
#include <QtMath>

#include <QIcon>
#include <QTextEdit>
#include "BaseInstance.h"
#include "InstanceList.h"
#include "InstanceView.h"
#include "Application.h"
#include "ui/themes/ThemeManager.h"
#include "ui/themes/ITheme.h"
#include "ui/ZTheme.h"


ListViewDelegate::ListViewDelegate(QObject* parent) : QStyledItemDelegate(parent) {}



// TODO this can be made a lot prettier
void drawProgressOverlay(QPainter* painter, const QStyleOptionViewItem& option, const int value, const int maximum)
{
    if (maximum == 0 || value == maximum) {
        return;
    }

    painter->save();

    qreal percent = (qreal)value / (qreal)maximum;
    QColor color = option.palette.color(QPalette::Dark);
    color.setAlphaF(0.70f);
    painter->setBrush(color);
    painter->setPen(QPen(QBrush(), 0));
    painter->drawPie(option.rect, 90 * 16, -percent * 360 * 16);

    painter->restore();
}



namespace {
constexpr int CardWidth = 164;
constexpr int CardHeight = 196;
constexpr int CardInset = 6;
constexpr int CardIconSize = 64;
constexpr int CardArtHeight = 112;

QRect cardRectFor(const QRect& itemRect)
{
    return itemRect.adjusted(CardInset, CardInset, -CardInset, -CardInset);
}

QRect nameRectFor(const QRect& itemRect)
{
    QRect card = cardRectFor(itemRect);
    return QRect(card.left() + 10, card.top() + CardArtHeight + 10, card.width() - 20, 22);
}
}  // namespace

void ListViewDelegate::paint(QPainter* painter, const QStyleOptionViewItem& option, const QModelIndex& index) const
{
    QStyleOptionViewItem opt = option;
    initStyleOption(&opt, index);
    painter->save();
    painter->setClipRect(opt.rect);
    painter->setRenderHint(QPainter::Antialiasing, true);
    painter->setRenderHint(QPainter::SmoothPixmapTransform, true);

    const bool selected = opt.state & QStyle::State_Selected;
    const bool hovered = opt.state & QStyle::State_MouseOver;
    auto instance = (BaseInstance*)index.data(InstanceList::InstancePointerRole).value<void*>();

    const QRect card = cardRectFor(opt.rect);
    QPainterPath cardPath;
    cardPath.addRoundedRect(card, 16, 16);

    // card body
    painter->fillPath(cardPath, hovered || selected ? ZTheme::SurfaceHigh : ZTheme::Surface);

    // art area: icon on a soft tinted backdrop
    QIcon::Mode mode = QIcon::Normal;
    if (!(opt.state & QStyle::State_Enabled))
        mode = QIcon::Disabled;
    QIcon::State state = opt.state & QStyle::State_Open ? QIcon::On : QIcon::Off;
    {
        QRect art(card.left() + 6, card.top() + 6, card.width() - 12, CardArtHeight - 6);
        QPainterPath artPath;
        artPath.addRoundedRect(art, 12, 12);
        QColor tint = ZTheme::dominantColor(opt.icon.pixmap(32, 32).toImage());
        QLinearGradient grad(art.topLeft(), art.bottomRight());
        QColor top = tint;
        top.setAlpha(selected ? 150 : 90);
        QColor bottom = tint.darker(300);
        bottom.setAlpha(selected ? 200 : 140);
        grad.setColorAt(0, top);
        grad.setColorAt(1, bottom);
        painter->fillPath(artPath, grad);

        const int iconSize = hovered || selected ? CardIconSize + 6 : CardIconSize;
        QRect iconRect(0, 0, iconSize, iconSize);
        iconRect.moveCenter(art.center());
        opt.icon.paint(painter, iconRect, Qt::AlignCenter, mode, state);
    }

    // name
    QFont nameFont = opt.font;
    nameFont.setBold(true);
    nameFont.setPointSizeF(qMax(9.0, opt.font.pointSizeF() + 0.5));
    painter->setFont(nameFont);
    painter->setPen(ZTheme::Text);
    const QRect nameRect = nameRectFor(opt.rect);
    painter->drawText(nameRect, Qt::AlignLeft | Qt::AlignVCenter,
                      QFontMetrics(nameFont).elidedText(index.data().toString(), Qt::ElideRight, nameRect.width()));

    // subtitle: version and loader
    if (instance) {
        auto meta = ZTheme::instanceMeta(instance);
        QStringList parts;
        if (!meta.gameVersion.isEmpty())
            parts << meta.gameVersion;
        parts << (meta.loader.isEmpty() ? QStringLiteral("Vanilla") : meta.loader);
        QFont subFont = opt.font;
        subFont.setPointSizeF(qMax(7.5, opt.font.pointSizeF() - 1));
        painter->setFont(subFont);
        painter->setPen(ZTheme::TextMuted);
        QRect subRect = nameRect.translated(0, nameRect.height());
        painter->drawText(subRect, Qt::AlignLeft | Qt::AlignVCenter,
                          QFontMetrics(subFont).elidedText(parts.join(QStringLiteral(" · ")), Qt::ElideRight, subRect.width()));

        // status pill in the top-left corner of the art
        QString pill;
        QColor pillColor;
        if (instance->isRunning()) {
            pill = tr("В ИГРЕ");
            pillColor = ZTheme::Accent;
        } else if (instance->hasCrashed() || instance->hasVersionBroken()) {
            pill = tr("СЛОМАНА");
            pillColor = ZTheme::Danger;
        } else if (instance->hasUpdateAvailable()) {
            pill = tr("ОБНОВЛЕНИЕ");
            pillColor = ZTheme::AccentAlt;
        }
        if (!pill.isEmpty()) {
            QFont pillFont = opt.font;
            pillFont.setBold(true);
            pillFont.setPointSizeF(7);
            painter->setFont(pillFont);
            QFontMetrics fm(pillFont);
            QRect pillRect(card.left() + 12, card.top() + 12, fm.horizontalAdvance(pill) + 14, fm.height() + 4);
            painter->setPen(Qt::NoPen);
            painter->setBrush(pillColor);
            painter->drawRoundedRect(pillRect, pillRect.height() / 2.0, pillRect.height() / 2.0);
            painter->setPen(pillColor == ZTheme::Accent ? ZTheme::Background : QColor(Qt::white));
            painter->drawText(pillRect, Qt::AlignCenter, pill);
        }
    }

    // outline
    painter->setBrush(Qt::NoBrush);
    if (selected) {
        painter->setPen(QPen(ZTheme::Accent, 2));
    } else if (hovered) {
        painter->setPen(QPen(ZTheme::Border.lighter(150), 1));
    } else {
        painter->setPen(QPen(ZTheme::Border, 1));
    }
    painter->drawPath(cardPath);

    drawProgressOverlay(painter, opt, index.data(InstanceViewRoles::ProgressValueRole).toInt(),
                        index.data(InstanceViewRoles::ProgressMaximumRole).toInt());

    painter->restore();
}

QSize ListViewDelegate::sizeHint([[maybe_unused]] const QStyleOptionViewItem& option, [[maybe_unused]] const QModelIndex& index) const
{
    return QSize(CardWidth, CardHeight);
}

class NoReturnTextEdit : public QTextEdit {
    Q_OBJECT
   public:
    explicit NoReturnTextEdit(QWidget* parent) : QTextEdit(parent)
    {
        setTextInteractionFlags(Qt::TextEditorInteraction);
        setHorizontalScrollBarPolicy(Qt::ScrollBarPolicy::ScrollBarAlwaysOff);
        setVerticalScrollBarPolicy(Qt::ScrollBarPolicy::ScrollBarAlwaysOff);
    }
    bool event(QEvent* event) override
    {
        auto eventType = event->type();
        if (eventType == QEvent::KeyPress || eventType == QEvent::KeyRelease) {
            QKeyEvent* keyEvent = static_cast<QKeyEvent*>(event);
            auto key = keyEvent->key();
            if ((key == Qt::Key_Return || key == Qt::Key_Enter) && eventType == QEvent::KeyPress) {
                emit editingDone();
                return true;
            }
            if (key == Qt::Key_Tab) {
                return true;
            }
        }
        return QTextEdit::event(event);
    }
   signals:
    void editingDone();
};

void ListViewDelegate::updateEditorGeometry(QWidget* editor,
                                            const QStyleOptionViewItem& option,
                                            [[maybe_unused]] const QModelIndex& index) const
{
    editor->setGeometry(nameRectFor(option.rect).adjusted(-4, -2, 4, 24));
}

void ListViewDelegate::setEditorData(QWidget* editor, const QModelIndex& index) const
{
    auto text = index.data(Qt::EditRole).toString();
    QTextEdit* realEditor = qobject_cast<NoReturnTextEdit*>(editor);
    realEditor->setAlignment(Qt::AlignHCenter | Qt::AlignTop);
    realEditor->append(text);
    realEditor->selectAll();
    realEditor->document()->clearUndoRedoStacks();
}

void ListViewDelegate::setModelData(QWidget* editor, QAbstractItemModel* model, const QModelIndex& index) const
{
    QTextEdit* realEditor = qobject_cast<NoReturnTextEdit*>(editor);
    QString text = realEditor->toPlainText();
    text.replace(QChar('\n'), QChar(' '));
    text = text.trimmed();
    // Prevent instance names longer than 128 chars
    text.truncate(128);
    if (text.size() != 0) {
        emit textChanged(model->data(index).toString(), text);
        model->setData(index, text);
    }
}

QWidget* ListViewDelegate::createEditor(QWidget* parent,
                                        [[maybe_unused]] const QStyleOptionViewItem& option,
                                        [[maybe_unused]] const QModelIndex& index) const
{
    auto editor = new NoReturnTextEdit(parent);
    connect(editor, &NoReturnTextEdit::editingDone, this, &ListViewDelegate::editingDone);
    return editor;
}

void ListViewDelegate::editingDone()
{
    NoReturnTextEdit* editor = qobject_cast<NoReturnTextEdit*>(sender());
    emit commitData(editor);
    emit closeEditor(editor);
}

#include "InstanceDelegate.moc"
