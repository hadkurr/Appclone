package com.hadkurr.appcloner.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.hadkurr.appcloner.R
import com.hadkurr.appcloner.model.CloneStatus
import com.hadkurr.appcloner.model.ClonedApp
import com.hadkurr.appcloner.util.ApkUtils
import com.hadkurr.appcloner.util.CloneStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.File
import java.util.UUID

class CloneService : Service() {

    private val job = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + job)

    companion object {
        const val TAG = "CloneService"
        const val CHANNEL_ID = "clone_channel"
        const val NOTIFICATION_ID = 1001

        const val EXTRA_ORIGINAL_APP_NAME = "original_app_name"
        const val EXTRA_ORIGINAL_PACKAGE = "original_package"
        const val EXTRA_APK_PATH = "apk_path"
        const val EXTRA_NEW_APP_NAME = "new_app_name"
        const val EXTRA_NEW_PACKAGE = "new_package"

        const val ACTION_CLONE_PROGRESS = "com.hadkurr.appcloner.CLONE_PROGRESS"
        const val EXTRA_CLONE_ID = "clone_id"
        const val EXTRA_STATUS = "status"
        const val EXTRA_PROGRESS = "progress"

        fun startClone(
            context: Context,
            originalAppName: String,
            originalPackage: String,
            apkPath: String,
            newAppName: String,
            newPackage: String
        ) {
            val intent = Intent(context, CloneService::class.java).apply {
                putExtra(EXTRA_ORIGINAL_APP_NAME, originalAppName)
                putExtra(EXTRA_ORIGINAL_PACKAGE, originalPackage)
                putExtra(EXTRA_APK_PATH, apkPath)
                putExtra(EXTRA_NEW_APP_NAME, newAppName)
                putExtra(EXTRA_NEW_PACKAGE, newPackage)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("App Cloner")
            .setContentText("Cloning app...")
            .setSmallIcon(android.R.drawable.ic_menu_rotate)
            .setOngoing(true)
            .build()

        startForeground(NOTIFICATION_ID, notification)

        intent?.let { processCloneRequest(it) }

        return START_NOT_STICKY
    }

    private fun processCloneRequest(intent: Intent) {
        val originalAppName = intent.getStringExtra(EXTRA_ORIGINAL_APP_NAME) ?: return
        val originalPackage = intent.getStringExtra(EXTRA_ORIGINAL_PACKAGE) ?: return
        val apkPath = intent.getStringExtra(EXTRA_APK_PATH) ?: return
        val newAppName = intent.getStringExtra(EXTRA_NEW_APP_NAME) ?: return
        val newPackage = intent.getStringExtra(EXTRA_NEW_PACKAGE) ?: return

        val cloneId = UUID.randomUUID().toString()

        scope.launch {
            try {
                // Step 1: Extract APK
                sendProgress(cloneId, CloneStatus.EXTRACTING, 10)
                val cloneDir = File(ApkUtils.getCloneDir(this@CloneService), cloneId)
                cloneDir.mkdirs()

                val extractedApk = ApkUtils.extractApk(this@CloneService, apkPath, cloneDir)
                if (extractedApk == null) {
                    sendProgress(cloneId, CloneStatus.FAILED, 0)
                    stopSelf()
                    return@launch
                }

                // Step 2: Modify package name
                sendProgress(cloneId, CloneStatus.MODIFYING, 40)
                val modifiedApk = File(cloneDir, "modified.apk")
                val modified = ApkUtils.modifyPackageName(
                    extractedApk, originalPackage, newPackage, newAppName, modifiedApk
                )
                if (!modified) {
                    sendProgress(cloneId, CloneStatus.FAILED, 0)
                    stopSelf()
                    return@launch
                }

                // Step 3: Sign APK
                sendProgress(cloneId, CloneStatus.SIGNING, 70)
                val signedApk = File(cloneDir, "clone_signed.apk")
                val signed = ApkUtils.signApk(this@CloneService, modifiedApk, signedApk)
                if (!signed) {
                    sendProgress(cloneId, CloneStatus.FAILED, 0)
                    stopSelf()
                    return@launch
                }

                // Clean up temp files
                extractedApk.delete()
                modifiedApk.delete()

                // Save clone info
                val clone = ClonedApp(
                    id = cloneId,
                    originalAppName = originalAppName,
                    originalPackageName = originalPackage,
                    clonedAppName = newAppName,
                    clonedPackageName = newPackage,
                    apkPath = signedApk.absolutePath,
                    icon = null,
                    status = CloneStatus.READY,
                    createdAt = System.currentTimeMillis()
                )
                CloneStore.saveClone(this@CloneService, clone)

                sendProgress(cloneId, CloneStatus.READY, 100)
                Log.d(TAG, "Clone completed: $cloneId")

            } catch (e: Exception) {
                Log.e(TAG, "Clone failed", e)
                sendProgress(cloneId, CloneStatus.FAILED, 0)
            } finally {
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
        }
    }

    private fun sendProgress(cloneId: String, status: CloneStatus, progress: Int) {
        CloneStore.updateStatus(this, cloneId, status)
        val intent = Intent(ACTION_CLONE_PROGRESS).apply {
            putExtra(EXTRA_CLONE_ID, cloneId)
            putExtra(EXTRA_STATUS, status.name)
            putExtra(EXTRA_PROGRESS, progress)
        }
        sendBroadcast(intent)

        // Update notification
        val statusText = when (status) {
            CloneStatus.EXTRACTING -> "Extracting APK..."
            CloneStatus.MODIFYING -> "Modifying package name..."
            CloneStatus.SIGNING -> "Signing APK..."
            CloneStatus.READY -> "Clone ready!"
            CloneStatus.FAILED -> "Clone failed"
            else -> "Processing..."
        }

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("App Cloner")
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.ic_menu_rotate)
            .setProgress(100, progress, false)
            .setOngoing(status != CloneStatus.READY && status != CloneStatus.FAILED)
            .build()

        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIFICATION_ID, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Clone Progress",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows clone progress"
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        job.cancel()
    }
}
