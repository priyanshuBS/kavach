package expo.modules.kavachguard

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/** The big red "SCAM ALERT" screen drawn on top of the call. */
class WarningOverlay(private val service: AccessibilityService) {
  private var view: View? = null
  private val windowManager by lazy { service.getSystemService(Context.WINDOW_SERVICE) as WindowManager }

  private fun dp(value: Int): Int = (value * service.resources.displayMetrics.density).toInt()

  fun show() {
    if (view != null) return

    val root = LinearLayout(service).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(dp(28), dp(40), dp(28), dp(40))
      setBackgroundColor(Color.parseColor("#F5A3001B"))
    }

    fun label(text: String, size: Float, bold: Boolean = false, alpha: Float = 1f) = TextView(service).apply {
      this.text = text
      textSize = size
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      this.alpha = alpha
      if (bold) setTypeface(typeface, Typeface.BOLD)
      setPadding(0, dp(6), 0, dp(6))
    }

    root.addView(label("⚠️", 64f))
    root.addView(label("SCAM ALERT", 36f, bold = true))
    root.addView(label("This call matches the digital arrest scam.", 19f, alpha = 0.92f))
    root.addView(label("Real police NEVER arrest anyone on a phone or video call.", 22f, bold = true))
    root.addView(label("Hang up now and call 1930.", 26f, bold = true))
    root.addView(label("Your family has been alerted on Telegram.", 15f, alpha = 0.8f))

    val callButton = Button(service).apply {
      text = "Call 1930 (Cyber helpline)"
      textSize = 18f
      isAllCaps = false
      setTextColor(Color.parseColor("#A3001B"))
      setTypeface(typeface, Typeface.BOLD)
      background = GradientDrawable().apply {
        cornerRadius = dp(16).toFloat()
        setColor(Color.WHITE)
      }
      setOnClickListener {
        hide()
        dial1930()
      }
    }
    val closeButton = Button(service).apply {
      text = "Close warning"
      textSize = 16f
      isAllCaps = false
      setTextColor(Color.WHITE)
      background = GradientDrawable().apply {
        cornerRadius = dp(16).toFloat()
        setColor(Color.TRANSPARENT)
        setStroke(dp(2), Color.WHITE)
      }
      setOnClickListener { hide() }
    }
    val buttonParams = { top: Int ->
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(58)).apply { topMargin = dp(top) }
    }
    root.addView(callButton, buttonParams(28))
    root.addView(closeButton, buttonParams(12))

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
      WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
      PixelFormat.TRANSLUCENT
    )
    try {
      windowManager.addView(root, params)
      view = root
      vibrate()
    } catch (e: Exception) {
      Log.e("KavachGuard", "could not show overlay", e)
    }
  }

  fun hide() {
    view?.let { runCatching { windowManager.removeView(it) } }
    view = null
  }

  private fun dial1930() {
    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:1930")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    runCatching { service.startActivity(intent) }
  }

  @Suppress("DEPRECATION")
  private fun vibrate() {
    val vibrator = service.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
    val pattern = longArrayOf(0, 600, 250, 600, 250, 900)
    runCatching {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
      } else {
        vibrator.vibrate(pattern, -1)
      }
    }
  }
}
