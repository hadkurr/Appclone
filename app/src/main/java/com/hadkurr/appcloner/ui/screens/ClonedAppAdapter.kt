package com.hadkurr.appcloner.ui.screens

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.hadkurr.appcloner.R
import com.hadkurr.appcloner.databinding.ItemClonedAppBinding
import com.hadkurr.appcloner.model.CloneStatus
import com.hadkurr.appcloner.model.ClonedApp

class ClonedAppAdapter(
    private val onInstallClick: (ClonedApp) -> Unit,
    private val onLaunchClick: (ClonedApp) -> Unit,
    private val onDeleteClick: (ClonedApp) -> Unit
) : ListAdapter<ClonedApp, ClonedAppAdapter.ClonedAppViewHolder>(ClonedAppDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ClonedAppViewHolder {
        val binding = ItemClonedAppBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ClonedAppViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ClonedAppViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ClonedAppViewHolder(
        private val binding: ItemClonedAppBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(clone: ClonedApp) {
            binding.cloneName.text = clone.clonedAppName
            binding.originalName.text = "Original: ${clone.originalAppName}"
            binding.clonePackage.text = clone.clonedPackageName

            val context = binding.root.context

            when (clone.status) {
                CloneStatus.READY -> {
                    binding.cloneStatus.text = "Ready to install"
                    binding.cloneStatus.setTextColor(context.getColor(R.color.success))
                    binding.installButton.visibility = View.VISIBLE
                    binding.launchButton.visibility = View.GONE
                }
                CloneStatus.INSTALLED -> {
                    binding.cloneStatus.text = "Installed"
                    binding.cloneStatus.setTextColor(context.getColor(R.color.success))
                    binding.installButton.visibility = View.GONE
                    binding.launchButton.visibility = View.VISIBLE
                }
                CloneStatus.FAILED -> {
                    binding.cloneStatus.text = "Failed"
                    binding.cloneStatus.setTextColor(context.getColor(R.color.error))
                    binding.installButton.visibility = View.GONE
                    binding.launchButton.visibility = View.GONE
                }
                else -> {
                    binding.cloneStatus.text = "Processing..."
                    binding.cloneStatus.setTextColor(context.getColor(R.color.on_surface_secondary))
                    binding.installButton.visibility = View.GONE
                    binding.launchButton.visibility = View.GONE
                }
            }

            if (clone.icon != null) {
                binding.appIcon.setImageDrawable(clone.icon)
            } else {
                binding.appIcon.setImageResource(android.R.drawable.sym_def_app_icon)
            }

            binding.installButton.setOnClickListener { onInstallClick(clone) }
            binding.launchButton.setOnClickListener { onLaunchClick(clone) }
            binding.deleteButton.setOnClickListener { onDeleteClick(clone) }
        }
    }

    private class ClonedAppDiffCallback : DiffUtil.ItemCallback<ClonedApp>() {
        override fun areItemsTheSame(oldItem: ClonedApp, newItem: ClonedApp): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: ClonedApp, newItem: ClonedApp): Boolean {
            return oldItem == newItem
        }
    }
}
