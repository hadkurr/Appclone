package com.hadkurr.appcloner.model

import android.graphics.drawable.Drawable

data class ClonedApp(
    val id: String,
    val originalAppName: String,
    val originalPackageName: String,
    val clonedAppName: String,
    val clonedPackageName: String,
    val apkPath: String,
    val icon: Drawable?,
    val status: CloneStatus,
    val createdAt: Long
)

enum class CloneStatus {
    PENDING,
    EXTRACTING,
    MODIFYING,
    SIGNING,
    READY,
    INSTALLED,
    FAILED
}
