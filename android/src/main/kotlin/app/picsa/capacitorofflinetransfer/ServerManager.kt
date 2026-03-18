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

/**
 * Embedded HTTP server for serving files over local network.
 * Zero-dependency implementation using ServerSocket.
 */
class ServerManager(private val context: Context, private val plugin: Plugin) {

    private var serverThread: Thread? = null
    private var serverSocket: ServerSocket? = null
    private val executor: ExecutorService = Executors.newCachedThreadPool()

    companion object {
        private const val TAG = "ServerManager"
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
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping server", e)
        }
    }

    private fun handleClient(client: Socket) {
        try {
            val reader = BufferedReader(InputStreamReader(client.getInputStream()))
            val firstLine = reader.readLine() ?: return
            
            // Basic HTTP request parsing: GET /filename HTTP/1.1
            val parts = firstLine.split(" ")
            if (parts.size < 2 || parts[0] != "GET") {
                sendErrorResponse(client, 400, "Bad Request")
                return
            }

            val rawUri = parts[1]
            val fileName = File(URLDecoder.decode(rawUri, "UTF-8")).name
            val file = File(context.filesDir, fileName)

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

    private fun sendFileResponse(client: Socket, file: File) {
        try {
            val out = client.getOutputStream()
            val mimeType = getMimeType(file.name)
            
            val header = "HTTP/1.1 200 OK\r\n" +
                    "Content-Type: $mimeType\r\n" +
                    "Content-Length: ${file.length()}\r\n" +
                    "Connection: close\r\n\r\n"
            
            out.write(header.toByteArray())
            
            FileInputStream(file).use { it.copyTo(out) }
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
        } catch (e: Exception) {}
    }

    private fun getMimeType(fileName: String): String {
        val extension = fileName.substringAfterLast('.', "")
        return if (extension.isNotEmpty()) {
            MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension) ?: "application/octet-stream"
        } else {
            "application/octet-stream"
        }
    }

    private fun getLocalIpAddress(): String? {
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

