package expo.modules.kavachguard

import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/** Minimal HTTP client for talking to the Kavach backend. */
object Backend {
  fun postJson(url: String, json: String): String = post(url, json.toByteArray(Charsets.UTF_8), "application/json")

  fun post(url: String, body: ByteArray, contentType: String): String {
    val conn = URL(url).openConnection() as HttpURLConnection
    try {
      conn.requestMethod = "POST"
      conn.connectTimeout = 6000
      conn.readTimeout = 30000
      conn.doOutput = true
      conn.setRequestProperty("Content-Type", contentType)
      conn.setFixedLengthStreamingMode(body.size)
      conn.outputStream.use { it.write(body) }

      val code = conn.responseCode
      val stream = if (code in 200..299) conn.inputStream else conn.errorStream
      val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
      if (code !in 200..299) {
        val message = runCatching { JSONObject(text).optString("error") }.getOrNull()
        throw IOException(if (message.isNullOrBlank()) "HTTP $code" else message)
      }
      return text
    } finally {
      conn.disconnect()
    }
  }
}

/** Wraps raw 16-bit mono PCM in a WAV header so Whisper can read it. */
object Wav {
  fun fromPcm16(pcm: ByteArray, sampleRate: Int): ByteArray {
    val header = ByteArray(44)
    val byteRate = sampleRate * 2
    fun putInt(offset: Int, value: Int) {
      header[offset] = (value and 0xFF).toByte()
      header[offset + 1] = ((value shr 8) and 0xFF).toByte()
      header[offset + 2] = ((value shr 16) and 0xFF).toByte()
      header[offset + 3] = ((value shr 24) and 0xFF).toByte()
    }
    fun putShort(offset: Int, value: Int) {
      header[offset] = (value and 0xFF).toByte()
      header[offset + 1] = ((value shr 8) and 0xFF).toByte()
    }
    "RIFF".toByteArray().copyInto(header, 0)
    putInt(4, 36 + pcm.size)
    "WAVE".toByteArray().copyInto(header, 8)
    "fmt ".toByteArray().copyInto(header, 12)
    putInt(16, 16) // PCM chunk size
    putShort(20, 1) // format = PCM
    putShort(22, 1) // channels = mono
    putInt(24, sampleRate)
    putInt(28, byteRate)
    putShort(32, 2) // block align
    putShort(34, 16) // bits per sample
    "data".toByteArray().copyInto(header, 36)
    putInt(40, pcm.size)
    return header + pcm
  }
}
