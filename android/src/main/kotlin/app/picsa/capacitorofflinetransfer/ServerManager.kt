package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.util.Log
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

    private fun getLocalIpAddress(): String {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val networkInterface = interfaces.nextElement()
                val addresses = networkInterface.inetAddresses
                while (addresses.hasMoreElements()) {
                    val address = addresses.nextElement()
                    if (!address.isLoopbackAddress && address is java.net.Inet4Address) {
                        return address.hostAddress ?: "192.168.43.1"
                    }
                }
            }
        } catch (e: Exception) {
            android.util.Log.e(TAG, "Error getting IP address", e)
        }
        return "192.168.43.1"
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
            return when {
                fileName.endsWith(".apk") -> "application/vnd.android.package-archive"
                fileName.endsWith(".mp4") -> "video/mp4"
                fileName.endsWith(".mkv") -> "video/x-matroska"
                fileName.endsWith(".webm") -> "video/webm"
                fileName.endsWith(".avi") -> "video/x-msvideo"
                fileName.endsWith(".mov") -> "video/quicktime"
                fileName.endsWith(".3gp") -> "video/3gpp"
                fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") -> "image/jpeg"
                fileName.endsWith(".png") -> "image/png"
                fileName.endsWith(".gif") -> "image/gif"
                fileName.endsWith(".webp") -> "image/webp"
                fileName.endsWith(".bmp") -> "image/bmp"
                fileName.endsWith(".svg") -> "image/svg+xml"
                fileName.endsWith(".ico") -> "image/x-icon"
                fileName.endsWith(".pdf") -> "application/pdf"
                fileName.endsWith(".zip") -> "application/zip"
                fileName.endsWith(".json") -> "application/json"
                fileName.endsWith(".xml") -> "application/xml"
                fileName.endsWith(".txt") -> "text/plain"
                fileName.endsWith(".html") || fileName.endsWith(".htm") -> "text/html"
                fileName.endsWith(".css") -> "text/css"
                fileName.endsWith(".js") -> "application/javascript"
                fileName.endsWith(".wasm") -> "application/wasm"
                fileName.endsWith(".aab") -> "application/vnd.android.bundle"
                fileName.endsWith(".xap") -> "application/x-silverlight-2"
                else -> "application/octet-stream"
            }
        }
    }
}
