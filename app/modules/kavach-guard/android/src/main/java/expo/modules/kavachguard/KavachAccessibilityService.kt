package expo.modules.kavachguard

import android.accessibilityservice.AccessibilityService
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent

/**
 * Kavach does not read the screen. This accessibility service exists for two reasons:
 *  1. Android lets an app with an enabled accessibility service keep using the
 *     microphone while a call is active (other apps only get silence).
 *  2. It can draw the full-screen scam warning on top of the call screen
 *     without the "draw over other apps" permission.
 */
class KavachAccessibilityService : AccessibilityService() {

  companion object {
    @Volatile
    private var instance: KavachAccessibilityService? = null

    val isConnected: Boolean
      get() = instance != null

    /** Shows the warning over everything. Returns false if the service is not enabled. */
    fun showWarning(): Boolean {
      val service = instance ?: return false
      service.mainHandler.post { service.overlay.show() }
      return true
    }

    fun isEnabled(context: Context): Boolean {
      if (instance != null) return true
      val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
      val me = ComponentName(context, KavachAccessibilityService::class.java)
      return enabled.split(':').any {
        it.equals(me.flattenToString(), ignoreCase = true) || it.equals(me.flattenToShortString(), ignoreCase = true)
      }
    }
  }

  private val mainHandler = Handler(Looper.getMainLooper())
  private val overlay by lazy { WarningOverlay(this) }

  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    // Not used: Kavach never reads screen content.
  }

  override fun onInterrupt() {}

  override fun onUnbind(intent: Intent?): Boolean {
    instance = null
    mainHandler.post { overlay.hide() }
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    instance = null
    super.onDestroy()
  }
}
