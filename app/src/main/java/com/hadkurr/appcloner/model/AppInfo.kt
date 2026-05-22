package com.hadkurr.appcloner.model

import android.graphics.drawable.Drawable

data class AppInfo(
    val appName: String,
    val packageName: String,
    val versionName: String,
    val versionCode: Long,
    val apkPath: String,
    val icon: Drawable?,
    val isSystemApp: Boolean
)
