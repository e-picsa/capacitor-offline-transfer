package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Log
import com.getcapacitor.JSObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class LanClientManager(private val context: Context, private val plugin: CapacitorOfflineTransferPlugin) {

    private val executor = Executors.newCachedThreadPool()
    private val TAG = "LanClient"

    fun connect(url: String, displayName: String?) {
        executor.execute {
            var connection: HttpURLConnection? = null
            try {
                val connectUrl = if (url.endsWith("/")) "${url}connect" else "$url/connect"
                connection = openConnection(connectUrl)
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.setRequestProperty("Content-Type", "application/json")

                val payload = JSObject().apply {
                    put("displayName", displayName ?: "Manual Endpoint")
                }
                connection.outputStream.use { it.write(payload.toString().toByteArray()) }

                val responseCode = connection.responseCode
                connection.disconnect()

                if (responseCode != 200) {
                    throw Exception("Server rejected connection: $responseCode")
                }

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
                Log.e(TAG, "Failed to connect to $url", e)
                val resultEvent = JSObject().apply {
                    put("endpointId", url)
                    put("status", "FAILURE")
                    put("message", e.message)
                }
                plugin.emit("connectionResult", resultEvent)
            } finally {
                connection?.disconnect()
            }
        }
    }

    internal fun openConnection(url: String): HttpURLConnection {
        return URL(url).openConnection() as HttpURLConnection
    }

    fun sendMessage(url: String, data: String) {
        executor.execute {
            var connection: HttpURLConnection? = null
            try {
                val postUrl = if (url.endsWith("/")) "${url}message" else "$url/message"
                connection = openConnection(postUrl)
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.setRequestProperty("Content-Type", "text/plain")
                connection.outputStream.use { it.write(data.toByteArray()) }

                val responseCode = connection.responseCode
                if (responseCode != 200) {
                    Log.e(TAG, "Failed to send message: $responseCode")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error sending message", e)
            } finally {
                connection?.disconnect()
            }
        }
    }

    fun sendFile(url: String, filePath: String, fileName: String) {
        executor.execute {
            var connection: HttpURLConnection? = null
            try {
                val uploadUrl = if (url.endsWith("/")) "${url}upload" else "$url/upload"
                connection = openConnection(uploadUrl)
                connection.requestMethod = "POST"
                connection.doOutput = true
                connection.connectTimeout = 10000
                connection.readTimeout = 30000
                connection.setRequestProperty("Content-Type", "application/octet-stream")
                connection.setRequestProperty("X-Filename", fileName)

                val uri = Uri.parse(filePath)
                val fileSize = context.contentResolver.openFileDescriptor(uri, "r")?.use { it.statSize } ?: -1L

                context.contentResolver.openInputStream(uri)?.use { input ->
                    connection.outputStream.use { output ->
                        val buffer = ByteArray(8192)
                        var bytesRead: Int
                        var totalBytesRead = 0L

                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            output.write(buffer, 0, bytesRead)
                            totalBytesRead += bytesRead

                            if (fileSize > 0) {
                                val progressEvent = JSObject().apply {
                                    put("endpointId", url)
                                    put("payloadId", fileName)
                                    put("bytesTransferred", totalBytesRead)
                                    put("totalBytes", fileSize)
                                    put("status", "IN_PROGRESS")
                                }
                                plugin.emit("transferProgress", progressEvent)
                            }
                        }
                    }
                } ?: throw Exception("Could not open file: $filePath")

                val responseCode = connection.responseCode
                if (responseCode == 200) {
                    val progressEvent = JSObject().apply {
                        put("endpointId", url)
                        put("payloadId", fileName)
                        put("bytesTransferred", fileSize)
                        put("totalBytes", fileSize)
                        put("status", "SUCCESS")
                    }
                    plugin.emit("transferProgress", progressEvent)
                } else {
                    throw Exception("Upload failed: HTTP $responseCode")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error uploading file", e)
                val progressEvent = JSObject().apply {
                    put("endpointId", url)
                    put("payloadId", fileName)
                    put("bytesTransferred", 0L)
                    put("totalBytes", 0L)
                    put("status", "FAILURE")
                }
                plugin.emit("transferProgress", progressEvent)
            } finally {
                connection?.disconnect()
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
