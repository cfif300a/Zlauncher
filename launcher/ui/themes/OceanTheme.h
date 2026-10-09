// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include "FusionTheme.h"

class OceanTheme : public FusionTheme {
   public:
    virtual ~OceanTheme() {}
    QString id() override { return "ocean"; }
    QString name() override;
    QString tooltip() override { return ""; }
    bool hasStyleSheet() override { return true; }
    QString appStyleSheet() override;
    QPalette colorScheme() override;
    double fadeAmount() override { return 0.3; }
    QColor fadeColor() override { return QColor(11, 25, 44); }
};
