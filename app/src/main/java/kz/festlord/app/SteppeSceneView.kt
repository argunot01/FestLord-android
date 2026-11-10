package kz.festlord.app

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Shader
import android.view.View

/**
 * Original vector illustration of the steppe used as a lightweight app backdrop.
 * It is intentionally drawn in Canvas rather than loaded from an external server.
 */
class SteppeSceneView(context: Context) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val mountains = Path()
    private val gold = Color.rgb(219, 172, 83)

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.save()
        canvas.scale(width / 1000f, height / 440f)
        paint.shader = LinearGradient(0f, 0f, 0f, 440f,
            intArrayOf(Color.rgb(9, 18, 29), Color.rgb(47, 56, 55), Color.rgb(103, 76, 49)),
            null, Shader.TileMode.CLAMP)
        canvas.drawRect(0f, 0f, 1000f, 440f, paint)
        paint.shader = null

        // Faint, warm sunrise on the horizon.
        paint.color = Color.argb(60, 245, 188, 97)
        canvas.drawCircle(695f, 202f, 86f, paint)
        paint.color = Color.argb(170, 235, 177, 86)
        canvas.drawCircle(695f, 202f, 35f, paint)

        mountain(canvas, intArrayOf(7, 35, 48), 160f,
            floatArrayOf(0f, 0f, 115f, -72f, 230f, -18f, 400f, -137f, 520f, -47f, 710f, -166f, 835f, -82f, 1000f, -145f))
        mountain(canvas, intArrayOf(24, 33, 37), 265f,
            floatArrayOf(0f, -45f, 140f, -109f, 320f, -30f, 460f, -125f, 660f, -11f, 818f, -103f, 1000f, -40f))
        mountain(canvas, intArrayOf(42, 47, 38), 346f,
            floatArrayOf(0f, -39f, 210f, -50f, 392f, -21f, 575f, -47f, 752f, -25f, 1000f, -61f))
        paint.color = Color.rgb(35, 45, 34)
        canvas.drawRect(0f, 349f, 1000f, 440f, paint)

        // Yurt at left, with a warm doorway and ornament bands.
        paint.color = Color.rgb(14, 20, 23)
        canvas.drawOval(60f, 346f, 397f, 398f, paint)
        paint.color = Color.rgb(123, 103, 74)
        canvas.drawRoundRect(82f, 273f, 374f, 369f, 14f, 14f, paint)
        paint.color = Color.rgb(176, 150, 97)
        val roof = Path().apply {
            moveTo(55f, 276f); lineTo(228f, 205f); lineTo(396f, 276f); close()
        }
        canvas.drawPath(roof, paint)
        paint.color = Color.rgb(24, 27, 25)
        canvas.drawRect(202f, 295f, 270f, 371f, paint)
        paint.color = Color.rgb(187, 113, 51)
        canvas.drawRect(215f, 310f, 257f, 369f, paint)
        paint.color = Color.rgb(68, 47, 34)
        canvas.drawRect(82f, 288f, 374f, 298f, paint)
        paint.color = gold
        paint.strokeWidth = 3f
        for (x in 94..354 step 28) {
            canvas.drawLine(x.toFloat(), 287f, x + 9f, 297f, paint)
            canvas.drawLine(x + 9f, 297f, x + 17f, 287f, paint)
        }
        paint.color = Color.rgb(19, 26, 25)
        canvas.drawRoundRect(305f, 302f, 313f, 394f, 5f, 5f, paint)
        val flag = Path().apply { moveTo(309f, 301f); lineTo(374f, 312f); lineTo(309f, 337f); close() }
        paint.color = Color.rgb(171, 99, 55)
        canvas.drawPath(flag, paint)

        // Wolf silhouette looking toward the sun, on the right.
        paint.color = Color.rgb(13, 21, 22)
        val wolf = Path().apply {
            moveTo(696f, 361f)
            lineTo(718f, 341f); lineTo(731f, 295f); lineTo(753f, 286f)
            lineTo(767f, 256f); lineTo(785f, 280f); lineTo(803f, 263f)
            lineTo(817f, 293f); lineTo(844f, 306f); lineTo(849f, 321f)
            lineTo(822f, 327f); lineTo(799f, 320f)
            lineTo(798f, 355f); lineTo(822f, 379f); lineTo(827f, 407f)
            lineTo(808f, 408f); lineTo(786f, 376f); lineTo(779f, 346f)
            lineTo(765f, 374f); lineTo(766f, 413f); lineTo(746f, 413f)
            lineTo(746f, 361f); lineTo(728f, 383f)
            lineTo(714f, 408f); lineTo(690f, 408f)
            lineTo(714f, 365f); close()
        }
        canvas.drawPath(wolf, paint)

        paint.color = gold
        paint.textSize = 38f
        paint.isFakeBoldText = true
        canvas.drawText("ПУТЬ БАТЫРА", 50f, 65f, paint)
        paint.isFakeBoldText = false
        paint.color = Color.rgb(225, 212, 183)
        paint.textSize = 25f
        canvas.drawText("От новичка до легенды", 53f, 105f, paint)
        canvas.restore()
    }

    private fun mountain(canvas: Canvas, rgb: IntArray, baseline: Float, points: FloatArray) {
        mountains.reset()
        mountains.moveTo(0f, baseline + points[1])
        for (i in 2 until points.size step 2) mountains.lineTo(points[i], baseline + points[i + 1])
        mountains.lineTo(1000f, 440f)
        mountains.lineTo(0f, 440f)
        mountains.close()
        paint.color = Color.rgb(rgb[0], rgb[1], rgb[2])
        canvas.drawPath(mountains, paint)
    }
}
