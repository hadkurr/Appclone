package com.hadkurr.appcloner.ui.screens

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.core.content.FileProvider
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.hadkurr.appcloner.databinding.FragmentClonedAppsBinding
import com.hadkurr.appcloner.model.CloneStatus
import com.hadkurr.appcloner.model.ClonedApp
import com.hadkurr.appcloner.service.CloneService
import com.hadkurr.appcloner.util.CloneStore
import java.io.File

class ClonedAppsFragment : Fragment() {

    private var _binding: FragmentClonedAppsBinding? = null
    private val binding get() = _binding!!

    private lateinit var adapter: ClonedAppAdapter

    private val progressReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            loadClonedApps()
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentClonedAppsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = ClonedAppAdapter(
            onInstallClick = { installClone(it) },
            onLaunchClick = { launchClone(it) },
            onDeleteClick = { deleteClone(it) }
        )

        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter

        loadClonedApps()
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter(CloneService.ACTION_CLONE_PROGRESS)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requireContext().registerReceiver(progressReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            requireContext().registerReceiver(progressReceiver, filter)
        }
        loadClonedApps()
    }

    override fun onPause() {
        super.onPause()
        try {
            requireContext().unregisterReceiver(progressReceiver)
        } catch (_: Exception) {}
    }

    private fun loadClonedApps() {
        val clones = CloneStore.getClones(requireContext())
        adapter.submitList(clones)

        if (clones.isEmpty()) {
            binding.emptyLayout.visibility = View.VISIBLE
            binding.recyclerView.visibility = View.GONE
        } else {
            binding.emptyLayout.visibility = View.GONE
            binding.recyclerView.visibility = View.VISIBLE
        }
    }

    private fun installClone(clone: ClonedApp) {
        val apkFile = File(clone.apkPath)
        if (!apkFile.exists()) {
            Toast.makeText(requireContext(), "APK file not found", Toast.LENGTH_SHORT).show()
            return
        }

        val uri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            FileProvider.getUriForFile(
                requireContext(),
                "${requireContext().packageName}.fileprovider",
                apkFile
            )
        } else {
            Uri.fromFile(apkFile)
        }

        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
        }

        try {
            startActivity(intent)
            CloneStore.updateStatus(requireContext(), clone.id, CloneStatus.INSTALLED)
        } catch (e: Exception) {
            Toast.makeText(requireContext(), "Cannot install: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun launchClone(clone: ClonedApp) {
        val intent = requireContext().packageManager.getLaunchIntentForPackage(clone.clonedPackageName)
        if (intent != null) {
            startActivity(intent)
        } else {
            Toast.makeText(requireContext(), "App not installed or not found", Toast.LENGTH_SHORT).show()
        }
    }

    private fun deleteClone(clone: ClonedApp) {
        // Delete APK file
        val apkFile = File(clone.apkPath)
        if (apkFile.exists()) {
            apkFile.parentFile?.deleteRecursively()
        }

        // Remove from store
        CloneStore.removeClone(requireContext(), clone.id)
        loadClonedApps()

        Toast.makeText(requireContext(), "Clone deleted", Toast.LENGTH_SHORT).show()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
