// SPDX-License-Identifier: GPL-3.0-only
#include "OceanTheme.h"
#include <QObject>

QString OceanTheme::name() { return QObject::tr("Ocean Cyan"); }

QPalette OceanTheme::colorScheme() {
    QPalette palette;
    palette.setColor(QPalette::Window, QColor(11, 25, 44));
    palette.setColor(QPalette::WindowText, QColor(240, 249, 255));
    palette.setColor(QPalette::Base, QColor(15, 32, 56));
    palette.setColor(QPalette::AlternateBase, QColor(22, 45, 77));
    palette.setColor(QPalette::ToolTipBase, QColor(22, 45, 77));
    palette.setColor(QPalette::ToolTipText, QColor(240, 249, 255));
    palette.setColor(QPalette::Text, QColor(240, 249, 255));
    palette.setColor(QPalette::Button, QColor(30, 58, 138));
    palette.setColor(QPalette::ButtonText, QColor(240, 249, 255));
    palette.setColor(QPalette::BrightText, QColor(239, 68, 68));
    palette.setColor(QPalette::Link, QColor(56, 189, 248));
    palette.setColor(QPalette::Highlight, QColor(6, 182, 212));
    palette.setColor(QPalette::HighlightedText, Qt::black);
    palette.setColor(QPalette::PlaceholderText, QColor(148, 163, 184));
    return fadeInactive(palette, fadeAmount(), fadeColor());
}

QString OceanTheme::appStyleSheet() {
    return R"(
        QWidget { font-family: "Segoe UI", sans-serif; font-size: 9pt; }
        QMainWindow, QDialog, QStackedWidget, QWidget#centralWidget {
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #0B192C, stop:0.5 #163050, stop:1 #081220);
        }
        QGroupBox {
            background-color: rgba(22, 45, 77, 160);
            border: 1px solid #1E3E62;
            border-radius: 8px;
            margin-top: 12px;
            padding-top: 12px;
            font-weight: bold;
            color: #38BDF8;
        }
        QListView, QTreeView, QTableView, QListWidget, QTreeWidget {
            background-color: transparent;
            color: #F0F9FF;
            border: none;
        }
        QToolBar { background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #0F2038, stop:1 #1A3459); border: none; padding: 4px; spacing: 6px; }
        QToolButton { background: transparent; color: #F0F9FF; border: 1px solid transparent; border-radius: 6px; padding: 5px 10px; font-weight: 500; }
        QToolButton:hover { background-color: rgba(6, 182, 212, 40); border: 1px solid #0891B2; }
        QToolButton:pressed { background-color: #06B6D4; color: #000000; }
        QLineEdit, QSpinBox, QComboBox { background-color: rgba(22, 45, 77, 200); color: #F0F9FF; border: 1px solid #1E3E62; border-radius: 6px; padding: 5px 8px; selection-background-color: #06B6D4; }
        QLineEdit:focus, QSpinBox:focus, QComboBox:focus { border: 1px solid #22D3EE; }
        QPushButton { background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #1E3E62, stop:1 #122842); color: #F0F9FF; border: 1px solid #0891B2; border-radius: 6px; padding: 6px 14px; font-weight: 600; }
        QPushButton:hover { background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #0891B2, stop:1 #0E7490); color: #FFFFFF; border: 1px solid #38BDF8; }
        QPushButton:pressed { background-color: #22D3EE; border-color: #67E8F9; }
        QScrollBar:vertical, QScrollBar:horizontal { border: none; background: rgba(11, 25, 44, 100); width: 8px; height: 8px; border-radius: 4px; }
        QScrollBar::handle:vertical, QScrollBar::handle:horizontal { background: #1E3E62; min-height: 20px; border-radius: 4px; }
        QScrollBar::handle:vertical:hover, QScrollBar::handle:horizontal:hover { background: #06B6D4; }
        QMenu { background-color: #162D4D; color: #F0F9FF; border: 1px solid #0891B2; border-radius: 8px; padding: 4px; }
        QMenu::item:selected { background-color: #06B6D4; color: #000000; }
        QToolTip { color: #F0F9FF; background-color: #162D4D; border: 1px solid #06B6D4; border-radius: 6px; padding: 4px 8px; }
        QTabWidget::pane { border: 1px solid #1E3E62; border-radius: 8px; background: rgba(11, 25, 44, 150); }
        QTabBar::tab { background: #0F2038; color: #F0F9FF; border: 1px solid #1E3E62; padding: 6px 12px; border-top-left-radius: 6px; border-top-right-radius: 6px; }
        QTabBar::tab:selected { background: #06B6D4; color: #000000; font-weight: bold; }
    )";
}
