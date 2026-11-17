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
    private val hardwareStepCounter = manager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    private val accelerometer = if (hardwareStepCounter == null)
        manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) else null
    private val sensor = hardwareStepCounter ?: accelerometer
    private val source = when {
        hardwareStepCounter != null -> "sensor"
        accelerometer != null -> "accelerometer"
        else -> "none"
    }
    private var gravity = 9.81f
    private var peakArmed = true
    private var lastPeakNs = 0L
    private var cadence = 0
    private val prefs = activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private var listening = false

    private fun granted(): Boolean = hardwareStepCounter == null || Build.VERSION.SDK_INT < 29 ||
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
            .put("source", source)
            .put("approximate", source == "accelerometer")
            .put("granted", granted())
            .put("active", listening)
            .put("today", data.optInt(today, 0))
            .put("goal", prefs.getInt("goal", 7000))
            .put("week", week)
            .put("lastUpdated", prefs.getLong("updatedAt", 0L))
            .put("started", prefs.getBoolean("started", false))
            .put("note", "Шаги считаются после включения шагомера. На некоторых телефонах число шагов оценивается по акселерометру. Полный учёт в фоне требует отдельного режима.")
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
            manager.registerListener(this, sensor, if (hardwareStepCounter == null) SensorManager.SENSOR_DELAY_GAME else SensorManager.SENSOR_DELAY_NORMAL)
        } catch (_: SecurityException) { false }
        notifyJs(if (listening) "ready" else "unsupported")
    }

    fun pause() {
        if (listening) manager.unregisterListener(this)
        listening = false
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) { }

    /**
     * Estimate walking cadence from accelerometer peaks if hardware lacks a
     * step counter. Ignore isolated movements, require 3 rhythmic peaks.
     */
    private fun processAcceleration(event: SensorEvent): Long? {
        if (event.values.size < 3) return null
        val x=event.values[0]; val y=event.values[1]; val z=event.values[2]
        val magnitude=kotlin.math.sqrt(x*x+y*y+z*z)
        gravity=0.88f*gravity+0.12f*magnitude
        val pulse=magnitude-gravity
        if(pulse < 0.30f) peakArmed=true
        if(!peakArmed || pulse < 1.20f) return null
        peakArmed=false
        val currentNs=event.timestamp
        val spacing=(currentNs-lastPeakNs)/1_000_000L
        cadence=if(lastPeakNs!=0L && spacing in 300L..1400L)
            (cadence+1).coerceAtMost(30) else 1
        lastPeakNs=currentNs
        if(cadence<3)return null
        val stepIncrement=if(cadence==3) 3L else 1L
        val count=prefs.getLong("accelerometerSteps",0L)+stepIncrement
        prefs.edit().putLong("accelerometerSteps",count).apply()
        return count
    }

    override fun onSensorChanged(event: SensorEvent) {
        val current = when(event.sensor.type) {
            Sensor.TYPE_STEP_COUNTER -> event.values.firstOrNull()?.toLong() ?: return
            Sensor.TYPE_ACCELEROMETER -> processAcceleration(event) ?: return
            else -> return
        }
        if (current < 0) return
        val key = day()
        val lastDay = prefs.getString("lastDay", null)
        val lastRaw = prefs.getLong("lastRaw", -1L)
        val data = history()
        val sameDay = lastDay == key && prefs.getString("source", null) == source
        val delta = if (lastRaw >= 0L && current >= lastRaw && sameDay)
            (current - lastRaw).coerceAtMost(100000).toInt() else 0

        val total = (data.optInt(key, 0) + delta).coerceAtMost(100000)
        updateDay(key, total)
        prefs.edit()
            .putLong("lastRaw", current)
            .putString("lastDay", key)
            .putString("source", source)
            .putLong("updatedAt", System.currentTimeMillis())
            .putBoolean("started", true)
            .apply()
        notifyJs("steps")
    }
}
