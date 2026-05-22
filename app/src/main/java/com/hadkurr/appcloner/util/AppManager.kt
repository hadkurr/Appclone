package com.hadkurr.appcloner.util

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import com.hadkurr.appcloner.model.AppInfo

object AppManager {

    fun getInstalledApps(context: Context, includeSystem: Boolean = false): List<AppInfo> {
        val pm = context.packageManager
        val packages = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.getInstalledPackages(PackageManager.PackageInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION")
            pm.getInstalledPackages(0)
        }

        return packages.mapNotNull { packageInfo ->
            val appInfo = packageInfo.applicationInfo ?: return@mapNotNull null
            val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0

            if (!includeSystem && isSystem) return@mapNotNull null

            // Skip our own app
            if (packageInfo.packageName == context.packageName) return@mapNotNull null

            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode.toLong()
            }

            AppInfo(
                appName = appInfo.loadLabel(pm).toString(),
                packageName = packageInfo.packageName,
                versionName = packageInfo.versionName ?: "Unknown",
                versionCode = versionCode,
                apkPath = appInfo.sourceDir,
                icon = appInfo.loadIcon(pm),
                isSystemApp = isSystem
            )
        }.sortedBy { it.appName.lowercase() }
    }
}
