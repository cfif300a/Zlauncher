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
            font-size: 9pt;
        }
        QMainWindow, QDialog, QStackedWidget, QWidget#centralWidget {
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #18110D, stop:0.5 #2A1A12, stop:1 #140E0A);
        }
        QGroupBox {
            background-color: rgba(36, 25, 18, 160);
            border: 1px solid #473022;
            border-radius: 8px;
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
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #241912, stop:1 #352319);
            border: none;
            padding: 4px;
            spacing: 6px;
        }
        QToolButton {
            background: transparent;
            color: #FEF3C7;
            border: 1px solid transparent;
            border-radius: 6px;
            padding: 5px 10px;
            font-weight: 500;
        }
        QToolButton:hover {
            background-color: rgba(245, 158, 11, 40);
            border: 1px solid #D97706;
        }
        QToolButton:pressed {
            background-color: #F59E0B;
            color: #000000;
        }
        QLineEdit, QSpinBox, QComboBox {
            background-color: rgba(48, 33, 24, 200);
            color: #FEF3C7;
            border: 1px solid #5C3D2B;
            border-radius: 6px;
            padding: 5px 8px;
            selection-background-color: #F59E0B;
        }
        QLineEdit:focus, QSpinBox:focus, QComboBox:focus {
            border: 1px solid #FBBF24;
            background-color: rgba(61, 41, 29, 220);
        }
        QPushButton {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #4A3021, stop:1 #352115);
            color: #FEF3C7;
            border: 1px solid #D97706;
            border-radius: 6px;
            padding: 6px 14px;
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
            background: rgba(24, 17, 13, 100);
            width: 8px;
            height: 8px;
            border-radius: 4px;
        }
        QScrollBar::handle:vertical, QScrollBar::handle:horizontal {
            background: #473022;
            min-height: 20px;
            border-radius: 4px;
        }
        QScrollBar::handle:vertical:hover, QScrollBar::handle:horizontal:hover {
            background: #F59E0B;
        }
        QMenu {
            background-color: #241912;
            color: #FEF3C7;
            border: 1px solid #D97706;
            border-radius: 8px;
            padding: 4px;
        }
        QMenu::item:selected {
            background-color: #F59E0B;
            color: #000000;
        }
        QToolTip {
            color: #FEF3C7;
            background-color: #241912;
            border: 1px solid #F59E0B;
            border-radius: 6px;
            padding: 4px 8px;
        }
        QTabWidget::pane {
            border: 1px solid #473022;
            border-radius: 8px;
            background: rgba(24, 17, 13, 150);
        }
        QTabBar::tab {
            background: #241912;
            color: #FEF3C7;
            border: 1px solid #473022;
            padding: 6px 12px;
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
        }
        QTabBar::tab:selected {
            background: #D97706;
            color: #FFFFFF;
            font-weight: bold;
        }
    )";
}
