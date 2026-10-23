package expo.modules.kavachguard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

/** Shows the scam warning: overlay on top of the call (if enabled) + a loud notification. */
object Alerts {
  private const val CHANNEL_ALERT = "kavach_alert"
  private const val NOTIF_ALERT = 4102

  fun showScamWarning(context: Context): Boolean {
    val overlayShown = KavachAccessibilityService.showWarning()
    postNotification(context)
    return overlayShown
  }

  @Suppress("DEPRECATION")
  private fun postNotification(context: Context) {
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm.getNotificationChannel(CHANNEL_ALERT) == null) {
      val channel = NotificationChannel(CHANNEL_ALERT, "Scam alerts", NotificationManager.IMPORTANCE_HIGH)
      channel.description = "Warns you when a call looks like a digital arrest scam"
      channel.enableVibration(true)
      channel.vibrationPattern = longArrayOf(0, 600, 250, 600)
      nm.createNotificationChannel(channel)
    }
    val dial = PendingIntent.getActivity(
      context, 1, Intent(Intent.ACTION_DIAL, Uri.parse("tel:1930")),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val text = "Real police never arrest anyone on a video call. Hang up and call 1930."
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(context, CHANNEL_ALERT)
    } else {
      Notification.Builder(context).setPriority(Notification.PRIORITY_MAX).setVibrate(longArrayOf(0, 600, 250, 600))
    }
    val notification = builder
      .setSmallIcon(android.R.drawable.stat_sys_warning)
      .setContentTitle("⚠️ Scam call warning")
      .setContentText(text)
      .setStyle(Notification.BigTextStyle().bigText("This call matches the digital arrest scam. $text"))
      .setCategory(Notification.CATEGORY_ALARM)
      .setAutoCancel(true)
      .addAction(Notification.Action.Builder(null, "Call 1930", dial).build())
      .build()
    runCatching { nm.notify(NOTIF_ALERT, notification) }
  }
}
