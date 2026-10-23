package expo.modules.kavachguard

import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** The bridge between JavaScript (index.js) and the Android services. */
class KavachGuardModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("KavachGuard")

    Events("onStatus", "onUpdate", "onLevel")

    OnCreate {
      GuardService.listener = { name, body -> sendEvent(name, body) }
    }

    OnDestroy {
      GuardService.listener = null
    }

    Function("startGuard") { serverUrl: String, alwaysListen: Boolean, audioSource: Int ->
      val intent = Intent(context, GuardService::class.java).apply {
        action = GuardService.ACTION_START
        putExtra(GuardService.EXTRA_SERVER, serverUrl)
        putExtra(GuardService.EXTRA_ALWAYS, alwaysListen)
        putExtra(GuardService.EXTRA_SOURCE, audioSource)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
      true
    }

    Function("stopGuard") {
      context.stopService(Intent(context, GuardService::class.java))
    }

    Function("isGuardRunning") {
      GuardService.isRunning
    }

    Function("isAccessibilityEnabled") {
      KavachAccessibilityService.isEnabled(context)
    }

    Function("openAccessibilitySettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("openAppSettings") {
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
        .setData(android.net.Uri.parse("package:" + context.packageName))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Preview of the warning screen (returns false if only the notification could be shown).
    Function("showTestWarning") {
      Alerts.showScamWarning(context)
    }
  }
}
