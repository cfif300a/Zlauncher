// SPDX-License-Identifier: GPL-3.0-only
#include "EmeraldTheme.h"
#include <QObject>

QString EmeraldTheme::name() { return QObject::tr("Emerald Forest"); }

QPalette EmeraldTheme::colorScheme() {
    QPalette palette;
    palette.setColor(QPalette::Window, QColor(13, 31, 18));
    palette.setColor(QPalette::WindowText, QColor(236, 253, 245));
    palette.setColor(QPalette::Base, QColor(20, 43, 26));
    palette.setColor(QPalette::AlternateBase, QColor(27, 56, 34));
    palette.setColor(QPalette::ToolTipBase, QColor(27, 56, 34));
    palette.setColor(QPalette::ToolTipText, QColor(236, 253, 245));
    palette.setColor(QPalette::Text, QColor(236, 253, 245));
    palette.setColor(QPalette::Button, QColor(32, 69, 42));
    palette.setColor(QPalette::ButtonText, QColor(236, 253, 245));
    palette.setColor(QPalette::BrightText, QColor(239, 68, 68));
    palette.setColor(QPalette::Link, QColor(52, 211, 153));
    palette.setColor(QPalette::Highlight, QColor(16, 185, 129));
    palette.setColor(QPalette::HighlightedText, QColor(236, 253, 245));
    palette.setColor(QPalette::PlaceholderText, QColor(161, 161, 170));
    return fadeInactive(palette, fadeAmount(), fadeColor());
}

QString EmeraldTheme::appStyleSheet() {
    return R"(
        QWidget { font-family: "Segoe UI", sans-serif; font-size: 9pt; }
        QMainWindow, QDialog, QStackedWidget, QWidget#centralWidget {
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #0D1F12, stop:0.5 #1B3822, stop:1 #08140B);
        }
        QGroupBox {
            background-color: rgba(27, 56, 34, 160);
            border: 1px solid #284E31;
            border-radius: 8px;
            margin-top: 12px;
            padding-top: 12px;
            font-weight: bold;
            color: #34D399;
        }
        QListView, QTreeView, QTableView, QListWidget, QTreeWidget {
            background-color: transparent;
            color: #ECFDF5;
            border: none;
        }
        QToolBar { background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #142B1A, stop:1 #22422A); border: none; padding: 4px; spacing: 6px; }
        QToolButton { background: transparent; color: #ECFDF5; border: 1px solid transparent; border-radius: 6px; padding: 5px 10px; font-weight: 500; }
        QToolButton:hover { background-color: rgba(16, 185, 129, 40); border: 1px solid #059669; }
        QToolButton:pressed { background-color: #10B981; color: #000000; }
        QLineEdit, QSpinBox, QComboBox { background-color: rgba(27, 56, 34, 200); color: #ECFDF5; border: 1px solid #284E31; border-radius: 6px; padding: 5px 8px; selection-background-color: #10B981; }
        QLineEdit:focus, QSpinBox:focus, QComboBox:focus { border: 1px solid #34D399; }
        QPushButton { background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #20452A, stop:1 #132E1B); color: #ECFDF5; border: 1px solid #059669; border-radius: 6px; padding: 6px 14px; font-weight: 600; }
        QPushButton:hover { background: qlineargradient(x1:0, y1:0, x2:0, y2:1, stop:0 #059669, stop:1 #047857); color: #FFFFFF; border: 1px solid #34D399; }
        QPushButton:pressed { background-color: #10B981; border-color: #6EE7B7; }
        QScrollBar:vertical, QScrollBar:horizontal { border: none; background: rgba(13, 31, 18, 100); width: 8px; height: 8px; border-radius: 4px; }
        QScrollBar::handle:vertical, QScrollBar::handle:horizontal { background: #20452A; min-height: 20px; border-radius: 4px; }
        QScrollBar::handle:vertical:hover, QScrollBar::handle:horizontal:hover { background: #10B981; }
        QMenu { background-color: #1B3822; color: #ECFDF5; border: 1px solid #059669; border-radius: 8px; padding: 4px; }
        QMenu::item:selected { background-color: #10B981; color: #000000; }
        QToolTip { color: #ECFDF5; background-color: #1B3822; border: 1px solid #10B981; border-radius: 6px; padding: 4px 8px; }
        QTabWidget::pane { border: 1px solid #284E31; border-radius: 8px; background: rgba(13, 31, 18, 150); }
        QTabBar::tab { background: #142B1A; color: #ECFDF5; border: 1px solid #284E31; padding: 6px 12px; border-top-left-radius: 6px; border-top-right-radius: 6px; }
        QTabBar::tab:selected { background: #10B981; color: #000000; font-weight: bold; }
    )";
}
