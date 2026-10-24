// SPDX-License-Identifier: GPL-3.0-only
#include "ZTheme.h"

#include <QImage>
#include <QSet>

#include "BaseInstance.h"
#include "minecraft/MinecraftInstance.h"
#include "minecraft/PackProfile.h"

namespace ZTheme {

InstanceMeta instanceMeta(BaseInstance* instance)
{
    InstanceMeta meta;
    auto mc = dynamic_cast<MinecraftInstance*>(instance);
    if (!mc || !mc->getPackProfile())
        return meta;
    auto profile = mc->getPackProfile();
    meta.gameVersion = profile->getComponentVersion("net.minecraft");
    // components are loaded lazily; load them from disk once per instance, like the status bar does
    static QSet<QString> attempted;
    if (meta.gameVersion.isEmpty() && !attempted.contains(instance->id())) {
        attempted.insert(instance->id());
        profile->reload(Net::Mode::Offline);
        meta.gameVersion = profile->getComponentVersion("net.minecraft");
    }

    static const QList<QPair<QString, QString>> loaders = {
        { "net.neoforged", "NeoForge" },        { "net.minecraftforge", "Forge" },        { "net.fabricmc.fabric-loader", "Fabric" },
        { "org.quiltmc.quilt-loader", "Quilt" }, { "com.mumfrey.liteloader", "LiteLoader" },
    };
    for (const auto& [uid, name] : loaders) {
        if (!profile->getComponentVersion(uid).isEmpty()) {
            meta.loader = name;
            break;
        }
    }
    return meta;
}

QColor dominantColor(const QImage& source)
{
    if (source.isNull())
        return AccentAlt;
    QImage image = source.scaled(16, 16, Qt::IgnoreAspectRatio, Qt::SmoothTransformation).convertToFormat(QImage::Format_ARGB32);
    qint64 r = 0, g = 0, b = 0, n = 0;
    for (int y = 0; y < image.height(); y++) {
        for (int x = 0; x < image.width(); x++) {
            QRgb px = image.pixel(x, y);
            if (qAlpha(px) < 128)
                continue;
            r += qRed(px);
            g += qGreen(px);
            b += qBlue(px);
            n++;
        }
    }
    if (n == 0)
        return AccentAlt;
    QColor color(r / n, g / n, b / n);
    // keep the tint vivid enough to read as a color, dark enough for white text
    float h, s, v;
    color.getHsvF(&h, &s, &v);
    return QColor::fromHsvF(h < 0 ? 0.7f : h, qBound(0.45f, s, 0.85f), qBound(0.45f, v, 0.75f));
}

QString mainWindowStyleSheet()
{
    QString css = R"(
#zShell { background: @bg; }
#zShell QWidget { color: @text; }
#zShell QLabel { background: transparent; }

#zTitleBar { background: @bg; border-bottom: 1px solid @border; }
#zBrand { font-size: 15pt; font-weight: 800; letter-spacing: 2px; }

QToolButton#zNavTab {
    background: transparent; border: none; border-radius: 10px;
    padding: 7px 16px; color: @muted; font-weight: 600; font-size: 10pt;
}
QToolButton#zNavTab:hover { color: @text; background: @surface; }
QToolButton#zNavTab:checked { color: @bg; background: @accent; }

QToolButton#zTopButton {
    background: @surface; border: 1px solid @border; border-radius: 10px;
    padding: 6px 12px; color: @text; font-weight: 600;
}
QToolButton#zTopButton:hover { border-color: @accent; }
QToolButton#zTopButton::menu-indicator { image: none; width: 0; }

QToolButton#zWinMin, QToolButton#zWinMax, QToolButton#zWinClose {
    background: transparent; border: none; border-radius: 8px; color: @muted; font-size: 11pt;
}
QToolButton#zWinMin:hover, QToolButton#zWinMax:hover { background: @surfaceHigh; color: @text; }
QToolButton#zWinClose:hover { background: @danger; color: white; }

#zHero { border-radius: 22px; }
#zHeroKicker { color: rgba(255,255,255,0.65); font-size: 8pt; font-weight: 700; letter-spacing: 2px; }
#zHeroTitle { color: white; font-size: 26pt; font-weight: 800; }
QLabel#zChip {
    background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.15); border-radius: 11px;
    padding: 3px 10px; color: white; font-size: 8.5pt; font-weight: 600;
}

QPushButton#zPlay {
    background: @accent; color: #0d0e12; border: none; border-radius: 16px;
    font-size: 14pt; font-weight: 900; letter-spacing: 3px; padding: 0 34px;
}
QPushButton#zPlay:hover { background: #c9ff5c; }
QPushButton#zPlay:pressed { background: #9bd326; }
QPushButton#zPlay:disabled { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.4); }
QPushButton#zPlay[running="true"] { background: @danger; color: white; }

QToolButton#zHeroAction {
    background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.18); border-radius: 14px;
    color: white; font-weight: 600; padding: 0 14px;
}
QToolButton#zHeroAction:hover { background: rgba(255,255,255,0.14); }
QToolButton#zHeroAction:disabled { color: rgba(255,255,255,0.35); }
QToolButton#zHeroAction::menu-indicator { image: none; width: 0; }

#zSectionTitle { font-size: 15pt; font-weight: 800; }
#zSectionCount { color: @muted; font-size: 10pt; font-weight: 600; }

QLineEdit#zSearch {
    background: @surface; border: 1px solid @border; border-radius: 12px;
    padding: 7px 12px; color: @text; selection-background-color: @accentAlt;
}
QLineEdit#zSearch:focus { border-color: @accent; }

QPushButton#zPrimary {
    background: @accentAlt; color: white; border: none; border-radius: 12px; padding: 8px 18px; font-weight: 700;
}
QPushButton#zPrimary:hover { background: #8f74ff; }
QPushButton#zGhost {
    background: @surface; color: @text; border: 1px solid @border; border-radius: 12px; padding: 8px 14px; font-weight: 600;
}
QPushButton#zGhost:hover { border-color: @accent; }

#zLibrary, #zNewsPage { background: transparent; }
#zShell QAbstractScrollArea { background: transparent; border: none; }
#zShell QScrollBar:vertical { background: transparent; width: 10px; margin: 4px 2px; }
#zShell QScrollBar::handle:vertical { background: @border; border-radius: 3px; min-height: 30px; }
#zShell QScrollBar::handle:vertical:hover { background: @muted; }
#zShell QScrollBar::add-line, #zShell QScrollBar::sub-line { height: 0; }
#zShell QScrollBar::add-page, #zShell QScrollBar::sub-page { background: transparent; }

QTextBrowser#zNews { background: transparent; border: none; color: @text; font-size: 10.5pt; }

QStatusBar { background: @bg; color: @muted; border-top: 1px solid @border; }
QStatusBar QLabel { color: @muted; padding: 0 8px; }
)";
    const QList<QPair<QString, QColor>> vars = {
        { "@surfaceHigh", SurfaceHigh }, { "@surface", Surface }, { "@bg", Background },     { "@border", Border },
        { "@text", Text },               { "@muted", TextMuted }, { "@accentAlt", AccentAlt }, { "@accent", Accent },
        { "@danger", Danger },
    };
    for (const auto& [name, color] : vars)
        css.replace(name, color.name());
    return css;
}

}  // namespace ZTheme
