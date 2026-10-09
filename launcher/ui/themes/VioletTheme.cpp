// SPDX-License-Identifier: GPL-3.0-only
#include "VioletTheme.h"
#include <QObject>

QString VioletTheme::id() { return "violet"; }
QString VioletTheme::name() { return QObject::tr("Obsidian Violet"); }

QPalette VioletTheme::colorScheme() {
    QPalette palette;
    palette.setColor(QPalette::Window, QColor(17, 14, 27));
    palette.setColor(QPalette::WindowText, QColor(245, 243, 255));
    palette.setColor(QPalette::Base, QColor(24, 20, 38));
    palette.setColor(QPalette::AlternateBase, QColor(32, 27, 50));
    palette.setColor(QPalette::ToolTipBase, QColor(32, 27, 50));
    palette.setColor(QPalette::ToolTipText, QColor(245, 243, 255));
    palette.setColor(QPalette::Text, QColor(245, 243, 255));
    palette.setColor(QPalette::Button, QColor(38, 31, 59));
    palette.setColor(QPalette::ButtonText, QColor(245, 243, 255));
    palette.setColor(QPalette::BrightText, QColor(239, 68, 68));
    palette.setColor(QPalette::Link, QColor(192, 132, 252));
    palette.setColor(QPalette::Highlight, QColor(147, 51, 234));
    palette.setColor(QPalette::HighlightedText, Qt::white);
    palette.setColor(QPalette::PlaceholderText, QColor(168, 162, 158));
    return fadeInactive(palette, fadeAmount(), fadeColor());
}

double VioletTheme::fadeAmount() { return 0.3; }
QColor VioletTheme::fadeColor() { return QColor(17, 14, 27); }
bool VioletTheme::hasStyleSheet() { return true; }

QString VioletTheme::appStyleSheet() {
    return R"(
        QWidget { font-family: "Segoe UI", sans-serif; font-size: 9pt; }
        QMainWindow, QDialog, QStackedWidget, QWidget#centralWidget {
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #110E1B, stop:0.5 #231938, stop:1 #0D0B14);
        }
        QGroupBox {
            background-color: rgba(31, 25, 51, 160);
            border: 1px solid #4C3775;
            border-radius: 8px;
            margin-top: 12px;
            padding-top: 12px;
            font-weight: bold;
            color: #C084FC;
        }
        QListView, QTreeView, QTableView, QListWidget, QTreeWidget {
            background-color: transparent;
            color: #F5F3FF;
            border: none;
        }
        QToolBar { background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #181426, stop:1 #2B1E45); border: none; padding: 4px; spacing: 6px; }
        QToolButton { background: transparent; color: #F5F3FF; border: 1px solid transparent; border-radius: 6px; padding: 5px 10px; font-weight: 500; }
        QToolButton:hover { background-color: rgba(147, 51, 234, 40); border: 1px solid #7E22CE; }
        QToolButton:pressed { background-color: #9333EA; color: #FFFFFF; }
        QLineEdit, QSpinBox, QComboBox { background-color: rgba(31, 25, 51, 200); color: #F5F3FF; border: 1px solid #4C3775; border-radius: 6px; padding: 5px 8px; selection-background-color: #9333EA; }
        QLineEdit:focus, QSpinBox:focus, QComboBox:focus { border: 1px solid #A855F7; }
        QPushButton { background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #3B2D5E, stop:1 #251B3D); color: #F5F3FF; border: 1px solid #7E22CE; border-radius: 6px; padding: 6px 14px; font-weight: 600; }
        QPushButton:hover { background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #9333EA, stop:1 #6B21A8); color: #FFFFFF; border: 1px solid #C084FC; }
        QPushButton:pressed { background-color: #A855F7; border-color: #E9D5FF; }
        QScrollBar:vertical, QScrollBar:horizontal { border: none; background: rgba(17, 14, 27, 100); width: 8px; height: 8px; border-radius: 4px; }
        QScrollBar::handle:vertical, QScrollBar::handle:horizontal { background: #3B2D5E; min-height: 20px; border-radius: 4px; }
        QScrollBar::handle:vertical:hover, QScrollBar::handle:horizontal:hover { background: #9333EA; }
        QMenu { background-color: #1F1933; color: #F5F3FF; border: 1px solid #7E22CE; border-radius: 8px; padding: 4px; }
        QMenu::item:selected { background-color: #9333EA; color: #FFFFFF; }
        QToolTip { color: #F5F3FF; background-color: #1F1933; border: 1px solid #9333EA; border-radius: 6px; padding: 4px 8px; }
        QTabWidget::pane { border: 1px solid #4C3775; border-radius: 8px; background: rgba(17, 14, 27, 150); }
        QTabBar::tab { background: #181426; color: #F5F3FF; border: 1px solid #4C3775; padding: 6px 12px; border-top-left-radius: 6px; border-top-right-radius: 6px; }
        QTabBar::tab:selected { background: #9333EA; color: #FFFFFF; font-weight: bold; }
    )";
}

QString VioletTheme::tooltip() { return ""; }
