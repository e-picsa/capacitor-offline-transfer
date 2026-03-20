package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.net.Uri
import android.util.Log
import com.getcapacitor.JSObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class ManualConnectionManager(private val context: Context, private val plugin: CapacitorOfflineTransferPlugin) {

    private val executor = Executors.newCachedThreadPool()
    private val TAG = "ManualTransfer"

    fun connect(url: String, displayName: String?) {
        executor.execute {
            try {
                // Verify reachability before simulating connection
                val connection = openConnection(url)
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.connect()
                // We don't strictly care about the response code, just that we could connect to the socket
                val responseCode = connection.responseCode
                connection.disconnect()

                val endpointId = url 
                val foundEvent = JSObject().apply {
                    put("endpointId", endpointId)
                    put("endpointName", displayName ?: "Manual Endpoint")
                    put("serviceId", "manual")
                    put("url", url)
                }
                plugin.emit("endpointFound", foundEvent)

                val resultEvent = JSObject().apply {
                    put("endpointId", endpointId)
                    put("status", "SUCCESS")
                }
                plugin.emit("connectionResult", resultEvent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to connect manually to $url", e)
                val resultEvent = JSObject().apply {
                    put("endpointId", url)
                    put("status", "FAILURE")
                    put("message", e.message)
                }
                plugin.emit("connectionResult", resultEvent)
            }
        }
    }

    internal open fun openConnection(url: String): HttpURLConnection {
        return URL(url).openConnection() as HttpURLConnection
    }

    fun sendMessage(url: String, data: String) {
        executor.execute {
            var connection: HttpURLConnection? = null
            try {
                val postUrl = android.net.Uri.parse(url).buildUpon().appendPath("message").build().toString()
                connection = openConnection(postUrl)
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "text/plain")
                connection.outputStream.use { it.write(data.toByteArray()) }

                val responseCode = connection.responseCode
                if (responseCode != 200) {
                    Log.e(TAG, "Failed to send message: $responseCode")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error sending manual message", e)
            } finally {
                connection?.disconnect()
            }
        }
    }

    fun sendFile(url: String, filePath: String, fileName: String) {
        // For Manual/Tier 3, "sending" from client to server is actually handled as a notification
        // and the server would then download it, OR we just support Server -> Client.
        // For now, let's implement Client -> Server message notification about the file.
        executor.execute {
             try {
                // In this manual bridge mode, we'll just send a JSON message with the filename
                val metadata = JSObject().apply {
                    put("filePayloadId", System.currentTimeMillis())
                    put("fileName", fileName)
                    put("info", "File available via separate channel or manual transfer")
                }
                sendMessage(url, "FILE_METADATA:" + metadata.toString())
            } catch (e: Exception) {
                Log.e(TAG, "Error notifying about file", e)
            }
        }
    }

    fun disconnect(endpointId: String) {
        executor.execute {
            val lostEvent = JSObject().apply {
                put("endpointId", endpointId)
            }
            plugin.emit("endpointLost", lostEvent)
        }
    }
}
