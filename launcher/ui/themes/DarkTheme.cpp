// SPDX-License-Identifier: GPL-3.0-only
/*
 *  Prism Launcher - Minecraft Launcher
 *  Copyright (C) 2024 Tayou <git@tayou.org>
 *  Copyright (C) 2024 TheKodeToad <TheKodeToad@proton.me>
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
#include "DarkTheme.h"

#include <QObject>

QString DarkTheme::id()
{
    return "dark";
}

QString DarkTheme::name()
{
    return QObject::tr("Dark");
}

QPalette DarkTheme::colorScheme()
{
    QPalette darkPalette;
    // Base colors (Next-Gen Slate Dark)
    darkPalette.setColor(QPalette::Window, QColor(18, 19, 28));
    darkPalette.setColor(QPalette::WindowText, QColor(243, 244, 246));
    darkPalette.setColor(QPalette::Base, QColor(24, 25, 37));
    darkPalette.setColor(QPalette::AlternateBase, QColor(30, 31, 44));
    darkPalette.setColor(QPalette::ToolTipBase, QColor(30, 31, 44));
    darkPalette.setColor(QPalette::ToolTipText, QColor(243, 244, 246));
    darkPalette.setColor(QPalette::Text, QColor(243, 244, 246));
    darkPalette.setColor(QPalette::Button, QColor(33, 35, 52));
    darkPalette.setColor(QPalette::ButtonText, QColor(243, 244, 246));
    darkPalette.setColor(QPalette::BrightText, QColor(239, 68, 68));
    darkPalette.setColor(QPalette::Link, QColor(139, 92, 246));
    darkPalette.setColor(QPalette::Highlight, QColor(99, 102, 241));
    darkPalette.setColor(QPalette::HighlightedText, Qt::white);
    darkPalette.setColor(QPalette::PlaceholderText, QColor(156, 163, 175));
    return fadeInactive(darkPalette, fadeAmount(), fadeColor());
}

double DarkTheme::fadeAmount()
{
    return 0.3;
}

QColor DarkTheme::fadeColor()
{
    return QColor(18, 19, 28);
}

bool DarkTheme::hasStyleSheet()
{
    return true;
}

QString DarkTheme::appStyleSheet()
{
    return R"(
        QWidget {
            font-family: "Segoe UI", "Inter", sans-serif;
            font-size: 9pt;
        }
        QMainWindow {
            background-color: #12131C;
        }
        QToolBar {
            background: #181925;
            border: none;
            padding: 4px;
            spacing: 6px;
        }
        QToolButton {
            background: transparent;
            color: #F3F4F6;
            border: 1px solid transparent;
            border-radius: 6px;
            padding: 5px 10px;
            font-weight: 500;
        }
        QToolButton:hover {
            background-color: #2D2F45;
            border: 1px solid #373A53;
        }
        QToolButton:pressed {
            background-color: #4F46E5;
            color: #FFFFFF;
        }
        QLineEdit, QSpinBox, QComboBox {
            background-color: #1E1F2C;
            color: #F3F4F6;
            border: 1px solid #2D2F45;
            border-radius: 6px;
            padding: 5px 8px;
            selection-background-color: #6366F1;
        }
        QLineEdit:focus, QSpinBox:focus, QComboBox:focus {
            border: 1px solid #6366F1;
        }
        QPushButton {
            background-color: #2D2F45;
            color: #F3F4F6;
            border: 1px solid #373A53;
            border-radius: 6px;
            padding: 6px 14px;
            font-weight: 600;
        }
        QPushButton:hover {
            background-color: #373A53;
            border: 1px solid #4F46E5;
        }
        QPushButton:pressed {
            background-color: #4F46E5;
            border-color: #6366F1;
        }
        QScrollBar:vertical {
            border: none;
            background: #12131C;
            width: 8px;
            margin: 0px;
            border-radius: 4px;
        }
        QScrollBar::handle:vertical {
            background: #2D2F45;
            min-height: 20px;
            border-radius: 4px;
        }
        QScrollBar::handle:vertical:hover {
            background: #4F46E5;
        }
        QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
            height: 0px;
        }
        QMenu {
            background-color: #1E1F2C;
            color: #F3F4F6;
            border: 1px solid #2D2F45;
            border-radius: 8px;
            padding: 4px;
        }
        QMenu::item {
            padding: 6px 20px;
            border-radius: 4px;
        }
        QMenu::item:selected {
            background-color: #6366F1;
            color: #FFFFFF;
        }
        QToolTip {
            color: #F3F4F6;
            background-color: #1E1F2C;
            border: 1px solid #4F46E5;
            border-radius: 6px;
            padding: 4px 8px;
        }
    )";
}

QString DarkTheme::tooltip()
{
    return "";
}
