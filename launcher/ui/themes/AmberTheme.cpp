// SPDX-License-Identifier: GPL-3.0-only
#include "AmberTheme.h"
#include <QObject>

QString AmberTheme::name() { return QObject::tr("Sunset Amber"); }

QPalette AmberTheme::colorScheme() {
    QPalette palette;
    palette.setColor(QPalette::Window, QColor(24, 17, 13));
    palette.setColor(QPalette::WindowText, QColor(254, 243, 199));
    palette.setColor(QPalette::Base, QColor(36, 25, 18));
    palette.setColor(QPalette::AlternateBase, QColor(48, 33, 24));
    palette.setColor(QPalette::ToolTipBase, QColor(48, 33, 24));
    palette.setColor(QPalette::ToolTipText, QColor(254, 243, 199));
    palette.setColor(QPalette::Text, QColor(254, 243, 199));
    palette.setColor(QPalette::Button, QColor(61, 41, 29));
    palette.setColor(QPalette::ButtonText, QColor(254, 243, 199));
    palette.setColor(QPalette::BrightText, QColor(239, 68, 68));
    palette.setColor(QPalette::Link, QColor(251, 191, 36));
    palette.setColor(QPalette::Highlight, QColor(245, 158, 11));
    palette.setColor(QPalette::HighlightedText, Qt::black);
    palette.setColor(QPalette::PlaceholderText, QColor(161, 161, 170));
    return fadeInactive(palette, fadeAmount(), fadeColor());
}

QString AmberTheme::appStyleSheet() {
    return R"(
        QWidget {
            font-family: "Segoe UI", sans-serif;
            font-size: 9.5pt;
            color: #FEF3C7;
        }
        QMainWindow, QDialog, QStackedWidget, QWidget#centralWidget {
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #18110D, stop:0.5 #2A1A12, stop:1 #140E0A);
        }
        QGroupBox {
            background-color: rgba(36, 25, 18, 140);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 10px;
            margin-top: 12px;
            padding-top: 12px;
            font-weight: bold;
            color: #F59E0B;
        }
        QGroupBox::title {
            subcontrol-origin: margin;
            subcontrol-position: top left;
            padding: 0 8px;
            background-color: transparent;
        }
        QListView, QTreeView, QTableView, QListWidget, QTreeWidget {
            background-color: transparent;
            color: #FEF3C7;
            border: none;
        }
        QToolBar {
            background: rgba(24, 17, 13, 0.45);
            border-bottom: 1px solid rgba(245, 158, 11, 0.2);
            padding: 6px;
            spacing: 8px;
        }
        QToolButton {
            background: rgba(42, 26, 18, 0.4);
            color: #FEF3C7;
            border: 1px solid rgba(245, 158, 11, 0.25);
            border-radius: 8px;
            padding: 6px 14px;
            font-weight: 500;
        }
        QToolButton:hover {
            background-color: rgba(245, 158, 11, 0.25);
            border: 1px solid #D97706;
            color: #FFFFFF;
        }
        QToolButton:pressed {
            background-color: #F59E0B;
            color: #000000;
        }
        QLineEdit, QSpinBox, QComboBox {
            background-color: rgba(48, 33, 24, 180);
            color: #FEF3C7;
            border: 1px solid rgba(245, 158, 11, 0.35);
            border-radius: 8px;
            padding: 6px 10px;
            selection-background-color: #F59E0B;
        }
        QLineEdit:focus, QSpinBox:focus, QComboBox:focus {
            border: 1px solid #FBBF24;
            background-color: rgba(61, 41, 29, 220);
        }
        QPushButton {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 rgba(74, 48, 33, 0.8), stop:1 rgba(53, 33, 21, 0.8));
            color: #FEF3C7;
            border: 1px solid rgba(217, 119, 6, 0.6);
            border-radius: 8px;
            padding: 7px 16px;
            font-weight: 600;
        }
        QPushButton:hover {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #D97706, stop:1 #B45309);
            color: #FFFFFF;
            border: 1px solid #FBBF24;
        }
        QPushButton:pressed {
            background-color: #F59E0B;
            border-color: #FCD34D;
        }
        QScrollBar:vertical, QScrollBar:horizontal {
            border: none;
            background: transparent;
            width: 8px;
            height: 8px;
            border-radius: 4px;
        }
        QScrollBar::handle:vertical, QScrollBar::handle:horizontal {
            background: rgba(245, 158, 11, 0.3);
            min-height: 20px;
            border-radius: 4px;
        }
        QScrollBar::handle:vertical:hover, QScrollBar::handle:horizontal:hover {
            background: #F59E0B;
        }
        QMenu {
            background-color: rgba(36, 25, 18, 0.95);
            color: #FEF3C7;
            border: 1px solid #D97706;
            border-radius: 10px;
            padding: 6px;
        }
        QMenu::item:selected {
            background-color: #F59E0B;
            color: #000000;
            border-radius: 6px;
        }
        QToolTip {
            color: #FEF3C7;
            background-color: rgba(36, 25, 18, 0.95);
            border: 1px solid #F59E0B;
            border-radius: 8px;
            padding: 5px 10px;
        }
        QTabWidget::pane {
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 10px;
            background: rgba(24, 17, 13, 150);
        }
        QTabBar::tab {
            background: rgba(36, 25, 18, 0.6);
            color: #FEF3C7;
            border: 1px solid rgba(245, 158, 11, 0.2);
            padding: 7px 14px;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
        }
        QTabBar::tab:selected {
            background: #D97706;
            color: #FFFFFF;
            font-weight: bold;
        }
    )";
}
