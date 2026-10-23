package expo.modules.kavachguard

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import android.util.Log
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.max
import kotlin.math.sqrt

/**
 * Foreground service that runs while the guard is on.
 *
 * - Every ~0.7 s it checks whether a call is active (normal phone call or a
 *   WhatsApp/Meet style internet call), using AudioManager.mode. No phone
 *   permission is needed for this.
 * - During a call it records the microphone (16 kHz mono) and every few seconds
 *   uploads a WAV chunk to the Kavach backend.
 * - When the backend says "alert", it shows the full-screen warning (through the
 *   accessibility service) and a high-priority notification.
 *
 * All network work happens on one background thread, in order, so the session
 * id is never shared between threads.
 */
class GuardService : Service() {

  companion object {
    private const val TAG = "KavachGuard"
    const val ACTION_START = "expo.modules.kavachguard.START"
    const val EXTRA_SERVER = "serverUrl"
    const val EXTRA_ALWAYS = "alwaysListen"
    const val EXTRA_SOURCE = "audioSource"

    private const val CHANNEL_GUARD = "kavach_guard"
    private const val NOTIF_GUARD = 4101
    private const val SAMPLE_RATE = 16000
    private const val CHUNK_SECONDS = 6
    private const val SILENCE_LEVEL = 0.003 // below this the chunk is not uploaded
    private const val MAX_PENDING_UPLOADS = 4

    @Volatile
    var isRunning = false
      private set

    /** Set by the Expo module so events reach JavaScript while the app is open. */
    @Volatile
    var listener: ((String, Map<String, Any?>) -> Unit)? = null

    fun emit(name: String, body: Map<String, Any?>) {
      try {
        listener?.invoke(name, body)
      } catch (e: Throwable) {
        Log.w(TAG, "emit failed", e)
      }
    }
  }

  @Volatile private var serverUrl = ""
  @Volatile private var alwaysListen = false
  @Volatile private var audioSource = MediaRecorder.AudioSource.MIC
  @Volatile private var stopRequested = false

  private var worker: Thread? = null
  private val network = Executors.newSingleThreadExecutor()
  private val pendingUploads = AtomicInteger(0)

  // Only touched on the network thread.
  private var sessionId: String? = null
  private var alertShown = false

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    serverUrl = intent?.getStringExtra(EXTRA_SERVER)?.trim()?.trimEnd('/') ?: serverUrl
    alwaysListen = intent?.getBooleanExtra(EXTRA_ALWAYS, false) ?: alwaysListen
    audioSource = intent?.getIntExtra(EXTRA_SOURCE, MediaRecorder.AudioSource.MIC) ?: audioSource

    createChannel()
    val notification = buildNotification("Kavach is guarding your calls", "You will be warned if a call looks like a scam")
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        startForeground(NOTIF_GUARD, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
      } else {
        startForeground(NOTIF_GUARD, notification)
      }
    } catch (e: Exception) {
      Log.e(TAG, "startForeground failed", e)
      emit("onStatus", mapOf("state" to "error", "message" to "Could not start guard: ${e.message}"))
      stopSelf()
      return START_NOT_STICKY
    }

    isRunning = true
    if (worker == null) {
      stopRequested = false
      worker = Thread({ watchLoop() }, "kavach-guard").also { it.start() }
    }
    emit("onStatus", mapOf("state" to "guarding", "message" to "Waiting for a call"))
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    stopRequested = true
    isRunning = false
    worker = null
    network.shutdown()
    emit("onStatus", mapOf("state" to "stopped", "message" to "Guard is off"))
    super.onDestroy()
  }

  // ---------------------------------------------------------------- call watching

  private fun callActive(am: AudioManager): Boolean =
    alwaysListen || am.mode == AudioManager.MODE_IN_CALL || am.mode == AudioManager.MODE_IN_COMMUNICATION

  private fun watchLoop() {
    val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
    while (!stopRequested) {
      try {
        if (callActive(am)) recordCall(am) else Thread.sleep(700)
      } catch (e: InterruptedException) {
        return
      } catch (e: Exception) {
        Log.e(TAG, "watch loop error", e)
        emit("onStatus", mapOf("state" to "error", "message" to (e.message ?: "Recording error")))
        try { Thread.sleep(3000) } catch (_: InterruptedException) { return }
      }
    }
  }

  @SuppressLint("MissingPermission")
  private fun recordCall(am: AudioManager) {
    runOnNetwork {
      sessionId = null
      alertShown = false
      sessionId = startSession()
    }
    emit("onStatus", mapOf("state" to "listening", "message" to "Listening to this call"))
    updateNotification("Kavach is listening to this call", "Put the call on speaker for best protection")

    val minBuffer = AudioRecord.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    val readSize = max(minBuffer, SAMPLE_RATE / 2 * 2) // ~0.5 s of audio
    val recorder = try {
      AudioRecord(audioSource, SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT, readSize * 4)
    } catch (e: Exception) {
      null
    }
    if (recorder == null || recorder.state != AudioRecord.STATE_INITIALIZED) {
      recorder?.release()
      emit("onStatus", mapOf("state" to "error", "message" to "Microphone is not available"))
      Thread.sleep(3000)
      return
    }

    val chunkBytes = SAMPLE_RATE * 2 * CHUNK_SECONDS
    val chunk = ByteArrayOutputStream(chunkBytes)
    val buffer = ByteArray(readSize)
    recorder.startRecording()
    try {
      while (!stopRequested) {
        val n = recorder.read(buffer, 0, buffer.size)
        if (n < 0) {
          emit("onStatus", mapOf("state" to "error", "message" to "Microphone read failed ($n)"))
          break
        }
        if (n > 0) chunk.write(buffer, 0, n)
        if (chunk.size() >= chunkBytes) {
          submitChunk(chunk.toByteArray())
          chunk.reset()
        }
        if (!callActive(am)) break
      }
    } finally {
      try { recorder.stop() } catch (_: Exception) {}
      recorder.release()
    }
    if (chunk.size() > SAMPLE_RATE * 2) submitChunk(chunk.toByteArray()) // leftover > 1 s

    runOnNetwork {
      sessionId?.let { id -> runCatching { Backend.postJson("$serverUrl/api/sessions/$id/end", "{}") } }
      sessionId = null
    }
    emit("onStatus", mapOf("state" to "guarding", "message" to "Call ended. Waiting for the next call"))
    updateNotification("Kavach is guarding your calls", "You will be warned if a call looks like a scam")
  }

  // ---------------------------------------------------------------- uploading

  private fun submitChunk(pcm: ByteArray) {
    val level = rmsLevel(pcm)
    emit("onLevel", mapOf("level" to level))
    if (level < SILENCE_LEVEL) return // silence, or Android is blocking the mic
    if (pendingUploads.get() >= MAX_PENDING_UPLOADS) return // network too slow, skip this chunk
    val wav = Wav.fromPcm16(pcm, SAMPLE_RATE)
    pendingUploads.incrementAndGet()
    runOnNetwork {
      try {
        uploadChunk(wav)
      } finally {
        pendingUploads.decrementAndGet()
      }
    }
  }

  private fun uploadChunk(wav: ByteArray) {
    try {
      val id = sessionId ?: startSession() ?: return
      sessionId = id
      val response = Backend.post("$serverUrl/api/sessions/$id/audio", wav, "audio/wav")
      emit("onUpdate", mapOf("json" to response))
      val alert = JSONObject(response).optJSONObject("risk")?.optBoolean("alert") == true
      if (alert && !alertShown) {
        alertShown = true
        Alerts.showScamWarning(this)
      }
    } catch (e: Exception) {
      Log.w(TAG, "upload failed", e)
      emit("onStatus", mapOf("state" to "error", "message" to "Server: ${e.message}"))
    }
  }

  private fun startSession(): String? = try {
    val res = Backend.postJson("$serverUrl/api/sessions", """{"source":"phone","title":"Phone call"}""")
    val id = JSONObject(res).getString("id")
    emit("onUpdate", mapOf("json" to res))
    id
  } catch (e: Exception) {
    Log.w(TAG, "could not start session", e)
    emit("onStatus", mapOf("state" to "error", "message" to "Cannot reach server at $serverUrl"))
    null
  }

  private fun runOnNetwork(block: () -> Unit) {
    try {
      network.execute(block)
    } catch (e: Exception) {
      // Executor already shut down because the guard was stopped.
    }
  }

  private fun rmsLevel(pcm: ByteArray): Double {
    var sum = 0.0
    var count = 0
    var i = 0
    while (i + 1 < pcm.size) {
      val sample = ((pcm[i + 1].toInt() shl 8) or (pcm[i].toInt() and 0xFF)).toShort().toDouble()
      sum += sample * sample
      count++
      i += 2
    }
    return if (count == 0) 0.0 else sqrt(sum / count) / 32768.0
  }

  // ---------------------------------------------------------------- notification

  private fun createChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (nm.getNotificationChannel(CHANNEL_GUARD) == null) {
        val channel = NotificationChannel(CHANNEL_GUARD, "Call guard", NotificationManager.IMPORTANCE_LOW)
        channel.description = "Shows while Kavach is protecting your calls"
        channel.setShowBadge(false)
        nm.createNotificationChannel(channel)
      }
    }
  }

  @Suppress("DEPRECATION")
  private fun buildNotification(title: String, text: String): Notification {
    val openApp = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(this, CHANNEL_GUARD)
    } else {
      Notification.Builder(this)
    }
    return builder
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(android.R.drawable.ic_secure)
      .setOngoing(true)
      .setContentIntent(openApp)
      .build()
  }

  private fun updateNotification(title: String, text: String) {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    nm.notify(NOTIF_GUARD, buildNotification(title, text))
  }
}
