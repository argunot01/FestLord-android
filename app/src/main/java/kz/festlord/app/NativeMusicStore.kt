package kz.festlord.app

import android.app.Activity
import android.content.Intent
import android.media.MediaPlayer
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Offline music library, using Android's Storage Access Framework.
 * Tracks are copied to app-private storage, so a source file can move or disappear.
 * No storage permission is needed.
 */
class NativeMusicStore(
    private val activity: Activity,
    private val notifyJs: (String, String) -> Unit
) {
    companion object { const val REQUEST_PICK_MUSIC = 1069 }

    private val prefs = activity.getSharedPreferences("batyrs_music_v1", Activity.MODE_PRIVATE)
    private val folder = File(activity.filesDir, "music_library").apply { mkdirs() }
    private var player: MediaPlayer? = null
    private var playingId: String? = null
    private var prepared = false
    private val fileRegex = Regex("^[a-f0-9-]{36}\\.(mp3|m4a|aac|ogg|opus|wav|flac|amr|3gp|audio)$")

    private fun tracks(): JSONArray =
        try { JSONArray(prefs.getString("tracks", "[]") ?: "[]") }
        catch (_: Exception) { JSONArray() }

    private fun save(array: JSONArray) {
        prefs.edit().putString("tracks", array.toString()).apply()
    }

    private fun find(id: String): JSONObject? {
        val all = tracks()
        for (i in 0 until all.length()) {
            val obj = all.optJSONObject(i) ?: continue
            if (obj.optString("id") == id) return obj
        }
        return null
    }

    @JavascriptInterface
    fun listTracks(): String = tracks().toString()

    @JavascriptInterface
    fun pickTrack() {
        activity.runOnUiThread {
            try {
                val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                    type = "audio/*"
                    addCategory(Intent.CATEGORY_OPENABLE)
                }
                activity.startActivityForResult(intent, REQUEST_PICK_MUSIC)
            } catch (_: Exception) { notifyJs("error", "Не удалось открыть выбор музыки") }
        }
    }

    fun receivePicked(uri: Uri) {
        Thread {
            var target: File? = null
            try {
                var titleFromProvider = "Моя музыка"
                var sizeReported = -1L
                activity.contentResolver.query(uri,
                    arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE),
                    null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val nameCol = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        val sizeCol = cursor.getColumnIndex(OpenableColumns.SIZE)
                        if (nameCol >= 0) titleFromProvider = cursor.getString(nameCol) ?: titleFromProvider
                        if (sizeCol >= 0 && !cursor.isNull(sizeCol)) sizeReported = cursor.getLong(sizeCol)
                    }
                }
                val limit = 80L * 1024 * 1024
                if (sizeReported > limit) throw IllegalArgumentException("Файл больше 80 МБ")
                val extension = titleFromProvider.substringAfterLast('.', "").lowercase()
                val supported = setOf("mp3", "m4a", "aac", "ogg", "opus", "wav", "flac", "amr", "3gp")
                val suffix = if (extension in supported) ".$extension" else ".audio"
                val id = UUID.randomUUID().toString()
                target = File(folder, id + suffix)
                var copied = 0L
                activity.contentResolver.openInputStream(uri)?.use { input ->
                    target!!.outputStream().use { output ->
                        val buffer = ByteArray(32768)
                        while (true) {
                            val n = input.read(buffer)
                            if (n < 0) break
                            copied += n
                            if (copied > limit) throw IllegalArgumentException("Файл больше 80 МБ")
                            output.write(buffer, 0, n)
                        }
                    }
                } ?: throw IllegalArgumentException("Не удалось прочитать аудиофайл")
                if (copied == 0L) throw IllegalArgumentException("Файл пустой")
                val friendly = titleFromProvider.substringBeforeLast('.', titleFromProvider)
                    .trim().take(70).ifBlank { "Моя музыка" }
                val obj = JSONObject().apply {
                    put("id", id)
                    put("title", friendly)
                    put("file", target!!.name)
                    put("size", copied)
                    put("added", System.currentTimeMillis())
                }
                val existing = tracks()
                val updated = JSONArray().apply {
                    put(obj) // As requested: newest saved tracks at the top.
                    for (i in 0 until existing.length()) put(existing.get(i))
                }
                save(updated)
                notifyJs("added", friendly)
            } catch (error: Exception) {
                target?.delete()
                notifyJs("error", error.message ?: "Ошибка сохранения аудио")
            }
        }.start()
    }

    @JavascriptInterface
    fun renameTrack(id: String, title: String): Boolean {
        val clean = title.trim().take(70)
        if (clean.isEmpty()) return false
        val all = tracks()
        var changed = false
        for (i in 0 until all.length()) {
            val item = all.optJSONObject(i) ?: continue
            if (item.optString("id") == id) {
                item.put("title", clean)
                changed = true
            }
        }
        if (changed) { save(all); notifyJs("renamed", clean) }
        return changed
    }

    @JavascriptInterface
    fun deleteTrack(id: String): Boolean {
        val target = find(id) ?: return false
        val filename = target.optString("file")
        if (!fileRegex.matches(filename)) return false
        val old = tracks()
        val fresh = JSONArray()
        for (i in 0 until old.length()) {
            val item = old.optJSONObject(i) ?: continue
            if (item.optString("id") != id) fresh.put(item)
        }
        if (playingId == id) activity.runOnUiThread { release(); notifyJs("stopped", "") }
        File(folder, filename).delete()
        save(fresh)
        notifyJs("deleted", "")
        return true
    }

    @JavascriptInterface
    fun playTrack(id: String) {
        activity.runOnUiThread {
            val name = find(id)?.optString("file") ?: ""
            if (!fileRegex.matches(name)) {
                notifyJs("error", "Трек не найден")
                return@runOnUiThread
            }
            val file = File(folder, name)
            if (!file.isFile) {
                notifyJs("error", "Файл удалён или недоступен")
                return@runOnUiThread
            }
            release()
            try {
                playingId = id
                player = MediaPlayer().apply {
                    setDataSource(file.absolutePath)
                    setOnPreparedListener { it -> prepared = true; it.start(); notifyJs("playing", id); reportPosition() }
                    setOnCompletionListener { notifyJs("finished", id); reportPosition() }
                    setOnErrorListener { _, _, _ ->
                        notifyJs("error", "Этот формат не воспроизводится")
                        true
                    }
                    prepareAsync()
                }
            } catch (_: Exception) {
                release()
                notifyJs("error", "Этот формат не воспроизводится")
            }
        }
    }

    @JavascriptInterface
    fun togglePause() {
        activity.runOnUiThread {
            val p = player ?: return@runOnUiThread
            if (!prepared) return@runOnUiThread
            try {
                if (p.isPlaying) { p.pause(); notifyJs("paused", playingId ?: "") }
                else { p.start(); notifyJs("playing", playingId ?: "") }
            } catch (_: Exception) { notifyJs("error", "Ошибка воспроизведения") }
        }
    }

    @JavascriptInterface
    fun stopTrack() {
        activity.runOnUiThread { release(); notifyJs("stopped", "") }
    }

    private fun reportPosition() {
        val p = player
        val data = JSONObject()
        try {
            data.put("id", playingId ?: "")
            data.put("position", if (prepared && p != null) p.currentPosition else 0)
            data.put("duration", if (prepared && p != null) p.duration else 0)
            data.put("playing", prepared && p?.isPlaying == true)
        } catch (_: Exception) {
            data.put("position", 0)
            data.put("duration", 0)
            data.put("playing", false)
        }
        notifyJs("position", data.toString())
    }

    @JavascriptInterface
    fun requestPosition() {
        activity.runOnUiThread { reportPosition() }
    }

    @JavascriptInterface
    fun seekTo(positionMs: Int) {
        activity.runOnUiThread {
            val p = player ?: return@runOnUiThread
            if (!prepared) return@runOnUiThread
            try {
                val duration = p.duration.coerceAtLeast(0)
                p.seekTo(positionMs.coerceIn(0, duration))
                reportPosition()
            } catch (_: Exception) { notifyJs("error", "Не удалось перемотать трек") }
        }
    }

    fun release() {
        try { player?.release() } catch (_: Exception) {}
        player = null
        playingId = null
        prepared = false
    }
}
