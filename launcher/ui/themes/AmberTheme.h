// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include "FusionTheme.h"

class AmberTheme : public FusionTheme {
   public:
    virtual ~AmberTheme() {}
    QString id() override { return "amber"; }
    QString name() override;
    QString tooltip() override { return ""; }
    bool hasStyleSheet() override { return true; }
    QString appStyleSheet() override;
    QPalette colorScheme() override;
    double fadeAmount() override { return 0.3; }
    QColor fadeColor() override { return QColor(24, 17, 13); }
};
