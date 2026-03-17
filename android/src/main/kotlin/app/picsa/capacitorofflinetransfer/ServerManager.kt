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

    fun start(port: Int, call: PluginCall) {
        try {
            server = NanoTransferServer(context, port)
            server?.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false)
            
            val ret = JSObject().apply {
                put("port", server?.listeningPort ?: port)
                put("url", "http://192.168.43.1:${server?.listeningPort ?: port}/") // Standard local hotspot IP
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

    private class NanoTransferServer(private val context: Context, port: Int) : NanoHTTPD(port) {

        override fun serve(session: IHTTPSession): Response {
            val uri = session.uri
            val fileName = uri.substringAfterLast("/")
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
                fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") -> "image/jpeg"
                fileName.endsWith(".png") -> "image/png"
                else -> "application/octet-stream"
            }
        }
    }
}
