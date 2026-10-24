// SPDX-License-Identifier: GPL-3.0-only
#pragma once

#include <QColor>
#include <QString>

class BaseInstance;

// Zlauncher shell palette. The main window always uses it, regardless of the selected widget theme.
namespace ZTheme {
inline const QColor Background{ 0x0d, 0x0e, 0x12 };
inline const QColor Surface{ 0x16, 0x18, 0x1f };
inline const QColor SurfaceHigh{ 0x1f, 0x22, 0x2c };
inline const QColor Border{ 0x2a, 0x2e, 0x3b };
inline const QColor Text{ 0xec, 0xee, 0xf3 };
inline const QColor TextMuted{ 0x8a, 0x90, 0xa2 };
inline const QColor Accent{ 0xb6, 0xf2, 0x3a };
inline const QColor AccentAlt{ 0x7c, 0x5c, 0xff };
inline const QColor Danger{ 0xff, 0x4d, 0x6d };

struct InstanceMeta {
    QString gameVersion;
    QString loader;
};

// Cheap lookup of the game version and mod loader of an instance, never triggers a reload.
InstanceMeta instanceMeta(BaseInstance* instance);

// Average opaque color of an image, used to tint the hero banner after the instance icon.
QColor dominantColor(const QImage& image);

QString mainWindowStyleSheet();
}  // namespace ZTheme
