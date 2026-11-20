package kz.festlord.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import org.json.JSONObject
import java.time.LocalDate

/** Keeps the step sensor registered during screen lock and task dismissal. */
class StepTrackingService : Service() {
    companion object {
        private const val CHANNEL = "batyr_steps_background"
        private const val ID = 2201
        @Volatile var isRunning = false
            private set

        fun start(context: Context) {
            val intent = Intent(context, StepTrackingService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent)
                else context.startService(intent)
            } catch (_: Exception) { /* Background launch may be restricted. */ }
        }
    }

    private lateinit var tracker: BatyrStepTracker
    private var notifiedAt = 0L

    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(CHANNEL, "Шагомер Batyr’s Way", NotificationManager.IMPORTANCE_LOW)
        channel.description = "Подсчёт шагов с заблокированным экраном"
        manager.createNotificationChannel(channel)
        tracker = BatyrStepTracker(this) {
            if (it == "steps") updateNotification()
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences("batyr_steps_v1", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("trackingEnabled", false) ||
            !tracker.isSupported() || !tracker.hasPermission()) {
            stopSelf()
            return START_NOT_STICKY
        }
        try {
            if (Build.VERSION.SDK_INT >= 34)
                startForeground(ID, notification(), ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH)
            else startForeground(ID, notification())
            tracker.resume()
            isRunning = tracker.isListening()
            if (!isRunning) {
                stopSelf()
                return START_NOT_STICKY
            }
        } catch (_: Exception) {
            isRunning = false
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    private fun notification(): Notification {
        val open = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pending = PendingIntent.getActivity(
            this, 0, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val prefs = getSharedPreferences("batyr_steps_v1", Context.MODE_PRIVATE)
        val today = try {
            JSONObject(prefs.getString("history", "{}") ?: "{}").optInt(LocalDate.now().toString(), 0)
        } catch (_: Exception) { 0 }
        return Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_menu_directions)
            .setContentTitle("Batyr’s Way — шагомер работает")
            .setContentText("Сегодня: ${today} шагов · подсчёт в фоне")
            .setContentIntent(pending)
            .setOnlyAlertOnce(true)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification() {
        val now = System.currentTimeMillis()
        if (now - notifiedAt < 10000L) return
        notifiedAt = now
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        try { manager.notify(ID, notification()) } catch (_: Exception) {}
    }

    override fun onDestroy() {
        tracker.pause()
        isRunning = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
