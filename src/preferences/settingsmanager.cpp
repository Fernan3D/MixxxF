#include "preferences/settingsmanager.h"

#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QLocale>
#include <QStandardPaths>
#include <QtDebug>

#include "control/control.h"
#include "preferences/upgrade.h"
#include "util/assert.h"

namespace {

void copyDirRecursively(const QString& src, const QString& dst) {
    QDir().mkpath(dst);
    const QFileInfoList entries = QDir(src).entryInfoList(
            QDir::Files | QDir::Dirs | QDir::NoDotAndDotDot);
    for (const QFileInfo& info : entries) {
        const QString destPath = QDir(dst).filePath(info.fileName());
        if (info.isDir()) {
            copyDirRecursively(info.absoluteFilePath(), destPath);
        } else if (!QFile::exists(destPath)) {
            QFile::copy(info.absoluteFilePath(), destPath);
        }
    }
}

// MixxxF usa %LOCALAPPDATA%/MixxxF. Si el perfil esta vacio, copia cfg,
// biblioteca y mapeos desde Mixxx oficial para no perder la libreria.
void migrateOfficialMixxxProfile(const QString& mixxxFPath) {
    if (QFile::exists(QDir(mixxxFPath).filePath(QStringLiteral("mixxx.cfg")))) {
        return;
    }
    const QString mixxxPath =
            QDir(QStandardPaths::writableLocation(QStandardPaths::GenericDataLocation))
                    .filePath(QStringLiteral("Mixxx"));
    if (!QDir(mixxxPath).exists()) {
        return;
    }
    qInfo() << "MixxxF: copiando perfil desde Mixxx oficial" << mixxxPath;
    const QStringList files = {
            QStringLiteral("mixxx.cfg"),
            QStringLiteral("mixxxdb.sqlite"),
            QStringLiteral("mixxxdb.sqlite-wal"),
            QStringLiteral("mixxxdb.sqlite-shm"),
            QStringLiteral("soundconfig.xml"),
            QStringLiteral("samplers.xml"),
            QStringLiteral("effects.xml"),
    };
    for (const QString& name : files) {
        const QString src = QDir(mixxxPath).filePath(name);
        if (QFile::exists(src)) {
            QFile::copy(src, QDir(mixxxFPath).filePath(name));
        }
    }
    const QString srcControllers = QDir(mixxxPath).filePath(QStringLiteral("controllers"));
    if (QDir(srcControllers).exists()) {
        copyDirRecursively(srcControllers,
                QDir(mixxxFPath).filePath(QStringLiteral("controllers")));
    }
}

} // namespace

SettingsManager::SettingsManager(const QString& settingsPath)
        : m_bShouldRescanLibrary(false) {
    // First make sure the settings path exists. If we don't then other parts of
    // Mixxx (such as the library) will produce confusing errors.
    if (!QDir(settingsPath).exists()) {
        QDir().mkpath(settingsPath);
    }

    migrateOfficialMixxxProfile(settingsPath);

    // Check to see if this is the first time this version of Mixxx is run
    // after an upgrade and make any needed changes.
    Upgrade upgrader;
    m_pSettings = upgrader.versionUpgrade(settingsPath);
    VERIFY_OR_DEBUG_ASSERT(!m_pSettings.isNull()) {
        m_pSettings = UserSettingsPointer(new UserSettings(""));
    }
    m_bShouldRescanLibrary = upgrader.rescanLibrary();

    // MixxxF: por defecto espanol. Solo se conservan ingles y espanol.
    const QString locale =
            m_pSettings->getValue(ConfigKey(QStringLiteral("[Config]"),
                                         QStringLiteral("Locale")),
                    QString());
    if (locale.isEmpty()) {
        m_pSettings->setValue(
                ConfigKey(QStringLiteral("[Config]"), QStringLiteral("Locale")),
                QStringLiteral("es"));
    } else {
        const QLocale selected(locale);
        if (selected.language() != QLocale::English &&
                selected.language() != QLocale::Spanish) {
            m_pSettings->setValue(
                    ConfigKey(QStringLiteral("[Config]"), QStringLiteral("Locale")),
                    QStringLiteral("es"));
        }
    }

    ControlDoublePrivate::setUserConfig(m_pSettings);

#ifdef __BROADCAST__
    m_pBroadcastSettings = BroadcastSettingsPointer(
                               new BroadcastSettings(m_pSettings));
#endif
}

SettingsManager::~SettingsManager() {
    ControlDoublePrivate::setUserConfig(UserSettingsPointer());
}
