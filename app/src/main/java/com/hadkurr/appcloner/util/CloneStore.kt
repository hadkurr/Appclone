package com.hadkurr.appcloner.util

import android.content.Context
import android.content.SharedPreferences
import com.hadkurr.appcloner.model.CloneStatus
import com.hadkurr.appcloner.model.ClonedApp
import org.json.JSONArray
import org.json.JSONObject

object CloneStore {

    private const val PREFS_NAME = "clone_store"
    private const val KEY_CLONES = "cloned_apps"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun saveClone(context: Context, clone: ClonedApp) {
        val clones = getClones(context).toMutableList()
        val existing = clones.indexOfFirst { it.id == clone.id }
        if (existing >= 0) {
            clones[existing] = clone
        } else {
            clones.add(clone)
        }
        saveClones(context, clones)
    }

    fun removeClone(context: Context, cloneId: String) {
        val clones = getClones(context).toMutableList()
        clones.removeAll { it.id == cloneId }
        saveClones(context, clones)
    }

    fun getClones(context: Context): List<ClonedApp> {
        val json = getPrefs(context).getString(KEY_CLONES, "[]") ?: "[]"
        return try {
            val array = JSONArray(json)
            (0 until array.length()).mapNotNull { i ->
                val obj = array.getJSONObject(i)
                ClonedApp(
                    id = obj.getString("id"),
                    originalAppName = obj.getString("originalAppName"),
                    originalPackageName = obj.getString("originalPackageName"),
                    clonedAppName = obj.getString("clonedAppName"),
                    clonedPackageName = obj.getString("clonedPackageName"),
                    apkPath = obj.getString("apkPath"),
                    icon = null,
                    status = CloneStatus.valueOf(obj.getString("status")),
                    createdAt = obj.getLong("createdAt")
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun updateStatus(context: Context, cloneId: String, status: CloneStatus) {
        val clones = getClones(context).toMutableList()
        val index = clones.indexOfFirst { it.id == cloneId }
        if (index >= 0) {
            clones[index] = clones[index].copy(status = status)
            saveClones(context, clones)
        }
    }

    private fun saveClones(context: Context, clones: List<ClonedApp>) {
        val array = JSONArray()
        clones.forEach { clone ->
            val obj = JSONObject().apply {
                put("id", clone.id)
                put("originalAppName", clone.originalAppName)
                put("originalPackageName", clone.originalPackageName)
                put("clonedAppName", clone.clonedAppName)
                put("clonedPackageName", clone.clonedPackageName)
                put("apkPath", clone.apkPath)
                put("status", clone.status.name)
                put("createdAt", clone.createdAt)
            }
            array.put(obj)
        }
        getPrefs(context).edit().putString(KEY_CLONES, array.toString()).apply()
    }
}
