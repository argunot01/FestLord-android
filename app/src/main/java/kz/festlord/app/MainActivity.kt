package kz.festlord.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.ValueCallback
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Batyr's Way v0.5.
 * The UI is a self-contained, offline HTML5 game view with original embedded character artwork.
 * Gameplay data lives in WebView localStorage. One-time migration imports the v0.4 native data.
 * No JavaScript bridge is exposed to untrusted remote content.
 */
class MainActivity : Activity() {
    private lateinit var browser: WebView
    private var chooser: ValueCallback<Array<Uri>>? = null
    private val fileRequestCode = 1068

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.rgb(13, 17, 23)
        window.navigationBarColor = Color.rgb(13, 17, 23)

        browser = WebView(this).apply {
            setBackgroundColor(Color.rgb(8, 11, 17))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.javaScriptCanOpenWindowsAutomatically = false
            settings.setSupportMultipleWindows(false)
            settings.mediaPlaybackRequiresUserGesture = true
            settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.allowFileAccessFromFileURLs = false
            settings.allowUniversalAccessFromFileURLs = false
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    chooser?.onReceiveValue(null)
                    chooser = filePathCallback
                    return try {
                        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                            type = "audio/*"
                            addCategory(Intent.CATEGORY_OPENABLE)
                        }
                        startActivityForResult(intent, fileRequestCode)
                        true
                    } catch (_: Exception) {
                        chooser?.onReceiveValue(null)
                        chooser = null
                        false
                    }
                }
            }
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val url = request.url.toString()
                    return url != "file:///android_asset/index.html"
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    if (url == "file:///android_asset/index.html") {
                        browser.evaluateJavascript("window.importNativeData(${nativeDataJson()})", null)
                    }
                }
            }
        }
        setContentView(browser)
        browser.loadUrl("file:///android_asset/index.html")
    }

    private fun nativeDataJson(): String {
        val old = getSharedPreferences("festlord", MODE_PRIVATE)
        val obj = JSONObject()
        obj.put("hasXp", old.contains("xp"))
        obj.put("xp", old.getInt("xp", 0))
        obj.put("hasExercises", old.contains("custom_exercises_v1"))
        val stored = old.getString("custom_exercises_v1", "[]") ?: "[]"
        obj.put("exercises", try { JSONArray(stored) } catch (_: Exception) { JSONArray() })
        obj.put("hasWeight", old.contains("weight"))
        obj.put("weight", old.getFloat("weight", 125f))
        obj.put("hasGoal", old.contains("goal"))
        obj.put("goal", old.getFloat("goal", 100f))
        val completed = JSONObject()
        val awarded = JSONObject()
        val earned = JSONObject()
        val finished = JSONObject()
        val pattern = Regex("^(completed|awarded)_(\\d{4}-\\d{2}-\\d{2})_(.+)_(\\d+)$")
        for ((key, value) in old.all) {
            when {
                pattern.matches(key) && value is Boolean -> {
                    val match = pattern.matchEntire(key) ?: continue
                    val destination = if (match.groupValues[1] == "completed") completed else awarded
                    val storageKey = match.groupValues[2] + "/" + match.groupValues[3] + "/" + match.groupValues[4]
                    destination.put(storageKey, value)
                }
                key.startsWith("earned_") && value is Int ->
                    earned.put(key.removePrefix("earned_"), value)
                key.startsWith("finished_") && value is Boolean ->
                    finished.put(key.removePrefix("finished_"), value)
            }
        }
        obj.put("done", completed)
        obj.put("awarded", awarded)
        obj.put("dayXp", earned)
        obj.put("finished", finished)
        return obj.toString()
    }

    @Deprecated("Legacy activity result for WebView audio picker")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == fileRequestCode) {
            val uri = if (resultCode == RESULT_OK) data?.data else null
            chooser?.onReceiveValue(uri?.let { arrayOf(it) })
            chooser = null
        }
    }

    @Deprecated("Legacy system back navigation")
    override fun onBackPressed() {
        browser.evaluateJavascript("window.handleHardwareBack()") { value ->
            if (value == "false" || value == "null") finish()
        }
    }

    override fun onDestroy() {
        chooser?.onReceiveValue(null)
        chooser = null
        browser.loadUrl("about:blank")
        browser.destroy()
        super.onDestroy()
    }
}
