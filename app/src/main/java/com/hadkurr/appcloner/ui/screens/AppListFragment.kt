package com.hadkurr.appcloner.ui.screens

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.hadkurr.appcloner.databinding.FragmentAppListBinding
import com.hadkurr.appcloner.model.AppInfo
import com.hadkurr.appcloner.util.AppManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AppListFragment : Fragment() {

    private var _binding: FragmentAppListBinding? = null
    private val binding get() = _binding!!

    private lateinit var adapter: AppListAdapter
    private var allApps: List<AppInfo> = emptyList()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAppListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = AppListAdapter { app -> openCloneConfig(app) }

        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter

        binding.searchEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                filterApps(s?.toString() ?: "")
            }
        })

        binding.swipeRefresh.setOnRefreshListener {
            loadApps()
        }

        loadApps()
    }

    private fun loadApps() {
        binding.progressBar.visibility = View.VISIBLE
        binding.emptyText.visibility = View.GONE

        lifecycleScope.launch {
            val apps = withContext(Dispatchers.IO) {
                AppManager.getInstalledApps(requireContext())
            }
            allApps = apps

            binding.progressBar.visibility = View.GONE
            binding.swipeRefresh.isRefreshing = false

            if (apps.isEmpty()) {
                binding.emptyText.visibility = View.VISIBLE
            } else {
                adapter.submitList(apps)
            }
        }
    }

    private fun filterApps(query: String) {
        if (query.isEmpty()) {
            adapter.submitList(allApps)
            return
        }
        val filtered = allApps.filter {
            it.appName.contains(query, ignoreCase = true) ||
                    it.packageName.contains(query, ignoreCase = true)
        }
        adapter.submitList(filtered)
        binding.emptyText.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    private fun openCloneConfig(app: AppInfo) {
        val intent = Intent(requireContext(), CloneConfigActivity::class.java).apply {
            putExtra(CloneConfigActivity.EXTRA_APP_NAME, app.appName)
            putExtra(CloneConfigActivity.EXTRA_PACKAGE_NAME, app.packageName)
            putExtra(CloneConfigActivity.EXTRA_VERSION_NAME, app.versionName)
            putExtra(CloneConfigActivity.EXTRA_APK_PATH, app.apkPath)
        }
        startActivity(intent)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
