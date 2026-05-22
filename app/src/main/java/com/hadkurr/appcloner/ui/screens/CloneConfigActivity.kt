package com.hadkurr.appcloner.ui.screens

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.hadkurr.appcloner.databinding.ActivityCloneConfigBinding
import com.hadkurr.appcloner.model.CloneStatus
import com.hadkurr.appcloner.service.CloneService

class CloneConfigActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCloneConfigBinding

    private var originalAppName: String = ""
    private var originalPackageName: String = ""
    private var versionName: String = ""
    private var apkPath: String = ""

    companion object {
        const val EXTRA_APP_NAME = "app_name"
        const val EXTRA_PACKAGE_NAME = "package_name"
        const val EXTRA_VERSION_NAME = "version_name"
        const val EXTRA_APK_PATH = "apk_path"
    }

    private val progressReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val status = intent?.getStringExtra(CloneService.EXTRA_STATUS) ?: return
            val progress = intent.getIntExtra(CloneService.EXTRA_PROGRESS, 0)

            runOnUiThread {
                updateProgress(CloneStatus.valueOf(status), progress)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCloneConfigBinding.inflate(layoutInflater)
        setContentView(binding.root)

        originalAppName = intent.getStringExtra(EXTRA_APP_NAME) ?: ""
        originalPackageName = intent.getStringExtra(EXTRA_PACKAGE_NAME) ?: ""
        versionName = intent.getStringExtra(EXTRA_VERSION_NAME) ?: ""
        apkPath = intent.getStringExtra(EXTRA_APK_PATH) ?: ""

        setupToolbar()
        setupUI()
    }

    private fun setupToolbar() {
        binding.toolbar.setNavigationOnClickListener { finish() }
    }

    private fun setupUI() {
        // Set app info
        binding.appNameText.text = originalAppName
        binding.appPackageText.text = originalPackageName
        binding.appVersionText.text = "v$versionName"

        // Load app icon
        try {
            val icon = packageManager.getApplicationIcon(originalPackageName)
            binding.appIcon.setImageDrawable(icon)
        } catch (_: PackageManager.NameNotFoundException) {
            binding.appIcon.setImageResource(android.R.drawable.sym_def_app_icon)
        }

        // Set default clone values
        binding.newAppNameInput.setText("$originalAppName Clone")
        binding.newPackageNameInput.setText("${originalPackageName}.clone")

        binding.startCloneButton.setOnClickListener {
            startClone()
        }
    }

    private fun startClone() {
        val newAppName = binding.newAppNameInput.text?.toString()?.trim()
        val newPackage = binding.newPackageNameInput.text?.toString()?.trim()

        if (newAppName.isNullOrEmpty()) {
            binding.newAppNameInput.error = "Required"
            return
        }
        if (newPackage.isNullOrEmpty()) {
            binding.newPackageNameInput.error = "Required"
            return
        }
        if (!isValidPackageName(newPackage)) {
            binding.newPackageNameInput.error = "Invalid package name"
            return
        }

        binding.startCloneButton.isEnabled = false
        binding.progressCard.visibility = View.VISIBLE

        CloneService.startClone(
            context = this,
            originalAppName = originalAppName,
            originalPackage = originalPackageName,
            apkPath = apkPath,
            newAppName = newAppName,
            newPackage = newPackage
        )
    }

    private fun updateProgress(status: CloneStatus, progress: Int) {
        binding.progressBar.progress = progress

        val statusText = when (status) {
            CloneStatus.EXTRACTING -> "Extracting APK..."
            CloneStatus.MODIFYING -> "Modifying package name..."
            CloneStatus.SIGNING -> "Signing APK..."
            CloneStatus.READY -> "Clone ready! Go to Cloned tab to install."
            CloneStatus.FAILED -> "Clone failed. Please try again."
            else -> "Processing..."
        }
        binding.progressText.text = statusText

        if (status == CloneStatus.READY) {
            Toast.makeText(this, "Clone completed!", Toast.LENGTH_LONG).show()
            binding.startCloneButton.isEnabled = true
            binding.startCloneButton.text = "Done"
            binding.startCloneButton.setOnClickListener { finish() }
        } else if (status == CloneStatus.FAILED) {
            binding.startCloneButton.isEnabled = true
        }
    }

    private fun isValidPackageName(name: String): Boolean {
        return name.matches(Regex("^[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)*$"))
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(CloneService.ACTION_CLONE_PROGRESS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(progressReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(progressReceiver, filter)
        }
    }

    override fun onPause() {
        super.onPause()
        try {
            unregisterReceiver(progressReceiver)
        } catch (_: Exception) {}
    }
}
