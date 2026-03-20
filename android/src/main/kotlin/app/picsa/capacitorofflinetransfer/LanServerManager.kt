package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.util.Log
import android.webkit.MimeTypeMap
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import java.io.*
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketException
import java.net.URLDecoder
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class LanServerManager(private val context: Context, private val plugin: CapacitorOfflineTransferPlugin) {

    private var serverThread: Thread? = null
    private var serverSocket: ServerSocket? = null
    private val executor: ExecutorService = Executors.newCachedThreadPool()

    companion object {
        private const val TAG = "LanServerManager"
    }

    fun start(port: Int, call: PluginCall) {
        try {
            serverSocket = ServerSocket(port)
            val actualPort = serverSocket?.localPort ?: port

            serverThread = Thread {
                while (!Thread.currentThread().isInterrupted) {
                    try {
                        val client = serverSocket?.accept() ?: break
                        executor.execute { handleClient(client) }
                    } catch (e: SocketException) {
                        Log.d(TAG, "Server socket closed")
                        break
                    } catch (e: Exception) {
                        Log.e(TAG, "Error accepting connection", e)
                    }
                }
            }
            serverThread?.start()

            val localIp = getLocalIpAddress()
            if (localIp == null) {
                stop()
                call.reject("Unable to determine device IP address on local network. Make sure Wi-Fi or hotspot is enabled.")
                return
            }

            val ret = JSObject().apply {
                put("port", actualPort)
                put("url", "http://$localIp:$actualPort/")
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to start server: ${e.message}")
        }
    }

    fun stop() {
        try {
            serverSocket?.close()
            serverSocket = null
            serverThread?.interrupt()
            serverThread = null
            executor.shutdownNow()
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping server", e)
        }
    }

    private fun handleClient(client: Socket) {
        try {
            val reader = BufferedReader(InputStreamReader(client.getInputStream()))
            val firstLine = reader.readLine() ?: return

            val parts = firstLine.split(" ")
            if (parts.size < 2) {
                sendErrorResponse(client, 400, "Bad Request")
                return
            }

            val method = parts[0]
            val rawUri = parts[1]

            when {
                method == "POST" && rawUri == "/message" -> {
                    handlePostMessage(client, reader)
                    return
                }
                method == "POST" && rawUri == "/connect" -> {
                    handlePostConnect(client, reader)
                    return
                }
                method == "POST" && rawUri == "/upload" -> {
                    handlePostUpload(client, reader)
                    return
                }
                method != "GET" -> {
                    sendErrorResponse(client, 400, "Bad Request")
                    return
                }
            }

            val fileName = File(URLDecoder.decode(rawUri, "UTF-8")).name
            val file = File(context.filesDir, fileName)

            if (!file.canonicalPath.startsWith(context.filesDir.canonicalPath)) {
                sendErrorResponse(client, 403, "Forbidden")
                return
            }

            if (file.exists() && file.isFile) {
                sendFileResponse(client, file)
            } else {
                sendErrorResponse(client, 404, "Not Found")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling client", e)
        } finally {
            try { client.close() } catch (e: Exception) {}
        }
    }

    private fun handlePostMessage(client: Socket, reader: BufferedReader) {
        try {
            var contentLength = 0
            var line: String? = reader.readLine()
            while (line != null && line.isNotEmpty()) {
                if (line.startsWith("Content-Length:", ignoreCase = true)) {
                    contentLength = line.substring(15).trim().toInt()
                }
                line = reader.readLine()
            }

            val body = CharArray(contentLength)
            reader.read(body, 0, contentLength)
            val message = String(body)

            val event = JSObject().apply {
                put("endpointId", client.inetAddress.hostAddress)
                put("data", message)
            }
            plugin.emit("messageReceived", event)

            val out = client.getOutputStream()
            val header = "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: text/plain\r\n" +
                    "Connection: close\r\n\r\n" +
                    "OK"
            out.write(header.toByteArray())
            out.flush()
        } catch (e: Exception) {
            Log.e(TAG, "Error handling POST message", e)
            sendErrorResponse(client, 500, "Internal Server Error")
        }
    }

    private fun handlePostConnect(client: Socket, reader: BufferedReader) {
        try {
            var contentLength = 0
            var line: String? = reader.readLine()
            while (line != null && line.isNotEmpty()) {
                if (line.startsWith("Content-Length:", ignoreCase = true)) {
                    contentLength = line.substring(15).trim().toInt()
                }
                line = reader.readLine()
            }

            val body = CharArray(contentLength)
            if (contentLength > 0) {
                reader.read(body, 0, contentLength)
            }
            val json = JSObject(String(body))
            val displayName = json.optString("displayName", "Unknown")
            val clientIp = client.inetAddress.hostAddress ?: "unknown"

            Log.d(TAG, "Client connected: $displayName ($clientIp)")

            val event = JSObject().apply {
                put("endpointId", clientIp)
                put("endpointName", displayName)
            }
            plugin.emit("emulatorClientConnected", event)

            val out = client.getOutputStream()
            val header = "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: application/json\r\n" +
                    "Connection: close\r\n\r\n" +
                    """{"status":"ok"}"""
            out.write(header.toByteArray())
            out.flush()
        } catch (e: Exception) {
            Log.e(TAG, "Error handling POST connect", e)
            sendErrorResponse(client, 500, "Internal Server Error")
        }
    }

    private fun handlePostUpload(client: Socket, reader: BufferedReader) {
        try {
            var contentLength = 0
            var line: String? = reader.readLine()
            val headers = mutableMapOf<String, String>()

            while (line != null && line.isNotEmpty()) {
                val colonIdx = line.indexOf(':')
                if (colonIdx > 0) {
                    val key = line.substring(0, colonIdx).trim().lowercase()
                    val value = line.substring(colonIdx + 1).trim()
                    headers[key] = value
                }
                if (line.startsWith("Content-Length:", ignoreCase = true)) {
                    contentLength = line.substring(15).trim().toInt()
                }
                line = reader.readLine()
            }

            val fileName = headers["x-filename"]
                ?: headers["content-disposition"]?.let { extractFilenameFromDisposition(it) }
                ?: "upload_${System.currentTimeMillis()}"

            val body = ByteArray(contentLength)
            var offset = 0
            val inputStream = client.getInputStream()
            while (offset < contentLength) {
                val read = inputStream.read(body, offset, contentLength - offset)
                if (read == -1) break
                offset += read
            }

            val targetFile = File(context.filesDir, fileName)
            FileOutputStream(targetFile).use { it.write(body) }

            val event = JSObject().apply {
                put("endpointId", client.inetAddress.hostAddress)
                put("payloadId", fileName)
                put("fileName", fileName)
                put("path", targetFile.absolutePath)
            }
            plugin.emit("fileReceived", event)

            val progressEvent = JSObject().apply {
                put("endpointId", client.inetAddress.hostAddress)
                put("payloadId", fileName)
                put("bytesTransferred", contentLength.toLong())
                put("totalBytes", contentLength.toLong())
                put("status", "SUCCESS")
            }
            plugin.emit("transferProgress", progressEvent)

            val out = client.getOutputStream()
            val responseBody = """{"status":"ok","fileName":"$fileName"}"""
            val header = "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: application/json\r\n" +
                    "Content-Length: ${responseBody.length}\r\n" +
                    "Connection: close\r\n\r\n"
            out.write(header.toByteArray())
            out.write(responseBody.toByteArray())
            out.flush()
        } catch (e: Exception) {
            Log.e(TAG, "Error handling POST upload", e)
            sendErrorResponse(client, 500, "Internal Server Error")
        }
    }

    private fun extractFilenameFromDisposition(disposition: String): String? {
        val regex = Regex("""filename[^;=\n]*=(?:(?:["'])([^"']*?)["']|([^\s;]*))""")
        val match = regex.find(disposition)
        return match?.groupValues?.getOrNull(1)?.takeIf { it.isNotEmpty() }
            ?: match?.groupValues?.getOrNull(2)?.takeIf { it.isNotEmpty() }
    }

    private fun sendFileResponse(client: Socket, file: File) {
        try {
            val out = client.getOutputStream()
            val mimeType = getMimeType(file.name)

            val header = "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: $mimeType\r\n" +
                    "Content-Length: ${file.length()}\r\n" +
                    "Connection: close\r\n\r\n"

            out.write(header.toByteArray())
            FileInputStream(file).use { it.transferTo(out) }
            out.flush()
        } catch (e: Exception) {
            Log.e(TAG, "Error sending file response", e)
        }
    }

    private fun sendErrorResponse(client: Socket, code: Int, message: String) {
        try {
            val out = client.getOutputStream()
            val header = "HTTP/1.1 $code $message\r\n" +
                    "Content-Type: text/plain\r\n" +
                    "Connection: close\r\n\r\n"
            out.write(header.toByteArray())
            out.write(message.toByteArray())
            out.flush()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to send error response to client", e)
        }
    }

    private fun getMimeType(fileName: String): String {
        val extension = fileName.substringAfterLast('.', "")
        return if (extension.isNotEmpty()) {
            MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: "application/octet-stream"
        } else {
            "application/octet-stream"
        }
    }

    internal fun getLocalIpAddress(): String? {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                val interfaceName = networkInterface.displayName
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address is java.net.Inet4Address) {
                        val hostAddress = address.hostAddress
                        Log.d(TAG, "Found valid IP: $hostAddress on interface: $interfaceName")
                        return hostAddress
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting IP address", e)
        }
        Log.w(TAG, "No valid IPv4 address found. Checked network interfaces:")
        logNetworkInterfaces()
        return null
    }

    private fun logNetworkInterfaces() {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                Log.d(TAG, "  Interface: ${networkInterface.displayName}")
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    Log.d(TAG, "    Address: ${address.hostAddress} (loopback: ${address.isLoopbackAddress}, IPv4: ${address is java.net.Inet4Address})")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error logging network interfaces", e)
        }
    }
}
