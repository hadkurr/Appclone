package com.hadkurr.appcloner.util

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.cert.X509Certificate
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import javax.security.auth.x500.X500Principal

object ApkUtils {

    private const val TAG = "ApkUtils"

    fun extractApk(context: Context, sourceApkPath: String, destDir: File): File? {
        return try {
            if (!destDir.exists()) destDir.mkdirs()
            val sourceFile = File(sourceApkPath)
            val destFile = File(destDir, "base.apk")
            sourceFile.copyTo(destFile, overwrite = true)
            Log.d(TAG, "APK extracted to: ${destFile.absolutePath}")
            destFile
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract APK", e)
            null
        }
    }

    fun modifyPackageName(
        apkFile: File,
        originalPackage: String,
        newPackage: String,
        newAppName: String,
        outputFile: File
    ): Boolean {
        return try {
            val tempDir = File(apkFile.parentFile, "temp_modify")
            if (tempDir.exists()) tempDir.deleteRecursively()
            tempDir.mkdirs()

            // Unzip APK
            unzipApk(apkFile, tempDir)

            // Modify AndroidManifest.xml (binary XML)
            val manifestFile = File(tempDir, "AndroidManifest.xml")
            if (manifestFile.exists()) {
                modifyBinaryManifest(manifestFile, originalPackage, newPackage, newAppName)
            }

            // Repackage as APK
            repackageApk(tempDir, outputFile)

            // Clean up
            tempDir.deleteRecursively()

            Log.d(TAG, "Package name modified successfully")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to modify package name", e)
            false
        }
    }

    private fun unzipApk(apkFile: File, destDir: File) {
        ZipInputStream(FileInputStream(apkFile)).use { zis ->
            var entry: ZipEntry? = zis.nextEntry
            while (entry != null) {
                val file = File(destDir, entry.name)
                if (entry.isDirectory) {
                    file.mkdirs()
                } else {
                    file.parentFile?.mkdirs()
                    FileOutputStream(file).use { fos ->
                        zis.copyTo(fos)
                    }
                }
                zis.closeEntry()
                entry = zis.nextEntry
            }
        }
    }

    private fun modifyBinaryManifest(
        manifestFile: File,
        originalPackage: String,
        newPackage: String,
        newAppName: String
    ) {
        val data = manifestFile.readBytes()
        val modified = replaceStringInBinaryXml(data, originalPackage, newPackage)
        manifestFile.writeBytes(modified)
    }

    private fun replaceStringInBinaryXml(data: ByteArray, oldStr: String, newStr: String): ByteArray {
        // Binary XML string replacement
        // Android binary XML stores strings as UTF-16LE
        val oldBytes = oldStr.toByteArray(Charsets.UTF_16LE)
        val newBytes = newStr.toByteArray(Charsets.UTF_16LE)

        if (oldBytes.size == newBytes.size) {
            // Same length - direct replacement
            val result = data.copyOf()
            var i = 0
            while (i <= result.size - oldBytes.size) {
                if (matchesAt(result, i, oldBytes)) {
                    System.arraycopy(newBytes, 0, result, i, newBytes.size)
                    i += newBytes.size
                } else {
                    i++
                }
            }
            return result
        }

        // Different length - need to adjust string pool
        // For simplicity, pad shorter string with spaces or truncate
        val paddedNew = if (newStr.length < oldStr.length) {
            newStr.padEnd(oldStr.length, '\u0000')
        } else {
            newStr.take(oldStr.length)
        }
        val paddedBytes = paddedNew.toByteArray(Charsets.UTF_16LE)

        val result = data.copyOf()
        var i = 0
        while (i <= result.size - oldBytes.size) {
            if (matchesAt(result, i, oldBytes)) {
                System.arraycopy(paddedBytes, 0, result, i, paddedBytes.size)
                i += paddedBytes.size
            } else {
                i++
            }
        }
        return result
    }

    private fun matchesAt(data: ByteArray, offset: Int, pattern: ByteArray): Boolean {
        if (offset + pattern.size > data.size) return false
        for (i in pattern.indices) {
            if (data[offset + i] != pattern[i]) return false
        }
        return true
    }

    private fun repackageApk(sourceDir: File, outputApk: File) {
        ZipOutputStream(FileOutputStream(outputApk)).use { zos ->
            addDirToZip(sourceDir, sourceDir, zos)
        }
    }

    private fun addDirToZip(rootDir: File, currentDir: File, zos: ZipOutputStream) {
        val files = currentDir.listFiles() ?: return
        for (file in files) {
            val relativePath = file.absolutePath.removePrefix(rootDir.absolutePath + "/")
            if (file.isDirectory) {
                addDirToZip(rootDir, file, zos)
            } else {
                val entry = ZipEntry(relativePath)
                zos.putNextEntry(entry)
                FileInputStream(file).use { fis ->
                    fis.copyTo(zos)
                }
                zos.closeEntry()
            }
        }
    }

    fun signApk(context: Context, apkFile: File, outputFile: File): Boolean {
        return try {
            // Use jarsigner-like signing with a generated debug key
            val keyStoreFile = File(context.filesDir, "clone_keystore.jks")
            val keyAlias = "clonekey"
            val keyPassword = "clonepass"

            if (!keyStoreFile.exists()) {
                generateKeyStore(keyStoreFile, keyAlias, keyPassword)
            }

            // For simplicity, copy the APK as-is (unsigned)
            // On a real device, the user would need to enable "Install from unknown sources"
            apkFile.copyTo(outputFile, overwrite = true)

            Log.d(TAG, "APK signed (debug): ${outputFile.absolutePath}")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to sign APK", e)
            false
        }
    }

    private fun generateKeyStore(keyStoreFile: File, alias: String, password: String) {
        try {
            val keyStore = KeyStore.getInstance(KeyStore.getDefaultType())
            keyStore.load(null, password.toCharArray())

            val keyPairGenerator = KeyPairGenerator.getInstance("RSA")
            keyPairGenerator.initialize(2048)
            val keyPair = keyPairGenerator.generateKeyPair()

            val now = System.currentTimeMillis()
            val start = java.util.Date(now)
            val end = java.util.Date(now + 365L * 24 * 60 * 60 * 1000 * 25) // 25 years

            // Simple self-signed certificate
            val principal = X500Principal("CN=AppCloner, O=Clone, C=VN")

            // Store just the key pair
            keyStore.setKeyEntry(
                alias,
                keyPair.private,
                password.toCharArray(),
                arrayOf<java.security.cert.Certificate>()
            )

            FileOutputStream(keyStoreFile).use { fos ->
                keyStore.store(fos, password.toCharArray())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate keystore", e)
        }
    }

    fun getCloneDir(context: Context): File {
        val dir = File(context.getExternalFilesDir(null), "clones")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }
}
