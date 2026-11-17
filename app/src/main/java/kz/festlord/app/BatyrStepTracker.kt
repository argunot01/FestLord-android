package kz.festlord.app

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate

/**
 * Step counter for phones with TYPE_STEP_COUNTER.
 * Counts only from the first activation, never invents historical steps.
 *
 * The sensor's value is cumulative since reboot while enabled. On the first
 * sample after a date gap we deliberately do not allocate an unknown delta
 * to the new day. This version has no persistent foreground sensor service.
 */
class BatyrStepTracker(
    private val activity: Activity,
    private val notifyJs: (String) -> Unit
) : SensorEventListener {
    companion object {
        const val PERMISSION_REQUEST_CODE = 1072
        private const val PREFS = "batyr_steps_v1"
    }

    private val manager = activity.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val sensor = manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    private val prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private var listening = false

    private fun granted(): Boolean = Build.VERSION.SDK_INT < 29 ||
        activity.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED

    private fun day(): String = LocalDate.now().toString()

    private fun history(): JSONObject =
        try { JSONObject(prefs.getString("history", "{}") ?: "{}") }
        catch (_: Exception) { JSONObject() }

    private fun updateDay(currentDay: String, amount: Int) {
        val history = history()
        history.put(currentDay, amount.coerceAtLeast(0))
        val today = LocalDate.parse(currentDay)
        val trimmed = JSONObject()
        // Local data only; retain last 90 days.
        for (i in 0..89) {
            val key = today.minusDays(i.toLong()).toString()
            if (history.has(key)) trimmed.put(key, history.optInt(key, 0))
        }
        prefs.edit().putString("history", trimmed.toString()).apply()
    }

    @JavascriptInterface
    fun getSnapshot(): String {
        val today = day()
        val data = history()
        val week = JSONArray()
        for (offset in 6 downTo 0) {
            val date = LocalDate.parse(today).minusDays(offset.toLong()).toString()
            week.put(JSONObject().put("date", date).put("steps", data.optInt(date, 0)))
        }
        return JSONObject()
            .put("supported", sensor != null)
            .put("granted", granted())
            .put("active", listening)
            .put("today", data.optInt(today, 0))
            .put("goal", prefs.getInt("goal", 7000))
            .put("week", week)
            .put("lastUpdated", prefs.getLong("updatedAt", 0L))
            .put("started", prefs.getBoolean("started", false))
            .put("note", "Шаги считаются после включения шагомера. Полный учёт в фоне требует отдельного режима.")
            .toString()
    }

    @JavascriptInterface
    fun requestAccess() {
        activity.runOnUiThread {
            if (sensor == null) { notifyJs("unsupported"); return@runOnUiThread }
            if (granted()) { resume(); notifyJs("ready"); return@runOnUiThread }
            if (Build.VERSION.SDK_INT >= 29)
                activity.requestPermissions(
                    arrayOf(Manifest.permission.ACTIVITY_RECOGNITION),
                    PERMISSION_REQUEST_CODE
                )
        }
    }

    @JavascriptInterface
    fun setGoal(newGoal: Int): Boolean {
        if (newGoal !in 500..30000) return false
        prefs.edit().putInt("goal", newGoal).apply()
        notifyJs("goal")
        return true
    }

    fun onPermissionResult() {
        if (granted()) resume()
        notifyJs(if (granted()) "ready" else "denied")
    }

    fun resume() {
        if (listening || sensor == null || !granted()) return
        listening = try {
            manager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_NORMAL)
        } catch (_: SecurityException) { false }
        notifyJs(if (listening) "ready" else "unsupported")
    }

    fun pause() {
        if (listening) manager.unregisterListener(this)
        listening = false
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) { }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_STEP_COUNTER) return
        val current = event.values.firstOrNull()?.toLong() ?: return
        if (current < 0) return
        val key = day()
        val lastDay = prefs.getString("lastDay", null)
        val lastRaw = prefs.getLong("lastRaw", -1L)
        val data = history()
        val sameDay = lastDay == key
        val delta = if (lastRaw >= 0L && current >= lastRaw && sameDay)
            (current - lastRaw).coerceAtMost(100000).toInt() else 0

        val total = (data.optInt(key, 0) + delta).coerceAtMost(100000)
        updateDay(key, total)
        prefs.edit()
            .putLong("lastRaw", current)
            .putString("lastDay", key)
            .putLong("updatedAt", System.currentTimeMillis())
            .putBoolean("started", true)
            .apply()
        notifyJs("steps")
    }
}
