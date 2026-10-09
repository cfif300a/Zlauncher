// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include "FusionTheme.h"

class EmeraldTheme : public FusionTheme {
   public:
    virtual ~EmeraldTheme() {}
    QString id() override { return "emerald"; }
    QString name() override;
    QString tooltip() override { return ""; }
    bool hasStyleSheet() override { return true; }
    QString appStyleSheet() override;
    QPalette colorScheme() override;
    double fadeAmount() override { return 0.3; }
    QColor fadeColor() override { return QColor(13, 31, 18); }
};
