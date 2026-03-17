package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.util.Log
import android.webkit.MimeTypeMap
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import fi.iki.elonen.NanoHTTPD
import java.io.File
import java.io.FileInputStream
import java.io.IOException

class ServerManager(private val context: Context, private val plugin: Plugin) {

    private var server: NanoTransferServer? = null

    companion object {
        private const val TAG = "ServerManager"
    }

    fun start(port: Int, call: PluginCall) {
        try {
            server = NanoTransferServer(context, port)
            server?.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false)
            
            val localIp = getLocalIpAddress()
            if (localIp == null) {
                server?.stop()
                server = null
                call.reject("Unable to determine device IP address on local network. Make sure Wi-Fi or hotspot is enabled.")
                return
            }
            
            val ret = JSObject().apply {
                put("port", server?.listeningPort ?: port)
                put("url", "http://$localIp:${server?.listeningPort ?: port}/")
            }
            call.resolve(ret)
        } catch (e: Exception) {
            call.reject("Failed to start server: ${e.message}")
        }
    }

    fun stop() {
        server?.stop()
        server = null
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
            android.util.Log.e(TAG, "Error getting IP address", e)
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

    private class NanoTransferServer(private val context: Context, port: Int) : NanoHTTPD(port) {

        override fun serve(session: IHTTPSession): Response {
            val uri = session.uri
            val fileName = File(uri).name
            val file = File(context.filesDir, fileName)

            return if (file.exists() && file.isFile) {
                try {
                    val fis = FileInputStream(file)
                    val mimeType = getMimeType(fileName)
                    newFixedLengthResponse(Response.Status.OK, mimeType, fis, file.length())
                } catch (e: IOException) {
                    newFixedLengthResponse(Response.Status.INTERNAL_ERROR, MIME_PLAINTEXT, "Error reading file")
                }
            } else {
                newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "File not found: $fileName")
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
    }
}
