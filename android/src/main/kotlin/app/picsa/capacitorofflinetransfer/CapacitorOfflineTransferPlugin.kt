package app.picsa.capacitorofflinetransfer

import android.Manifest
import android.net.Uri
import android.os.Build
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "OfflineTransfer",
    permissions = [
        Permission(
            alias = "nearby",
            strings = [
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.NEARBY_WIFI_DEVICES
            ]
        )
    ]
)

class CapacitorOfflineTransferPlugin : Plugin() {

    private val implementation = CapacitorOfflineTransfer()
    private var sessionStartTime: Long = 0

    @PermissionCallback
    private fun permissionsCallback(call: PluginCall) {
        try {
            val state = getPermissionState("nearby")
            if (state == PermissionState.GRANTED) {
                when (call.methodName) {
                    "startAdvertising" -> {
                        sessionStartTime = System.currentTimeMillis()
                        val displayName = call.getString("displayName")
                        implementation.startAdvertising(displayName, call)
                    }
                    "startDiscovery" -> {
                        sessionStartTime = System.currentTimeMillis()
                        implementation.startDiscovery(call)
                    }
                    "requestPermissions" -> {
                        val result = JSObject()
                        result.put("nearby", "granted")
                        call.resolve(result)
                    }
                    else -> call.reject("Unexpected method '${call.methodName}' in permissions callback.")
                }
            } else {
                if (call.methodName == "requestPermissions") {
                    val result = JSObject()
                    result.put("nearby", state?.toString() ?: "denied")
                    call.resolve(result)
                } else {
                    call.reject("Permissions denied. Please enable in Settings.")
                }
            }
        } catch (e: Exception) {
            call.reject("Permission check failed: ${e.message}")
        }
    }


    /**
     * JS-callable method to check permission status.
     * Returns: { nearby: "granted" | "denied" | "prompt" }
     */
    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        try {
            val state = getPermissionState("nearby")
            val result = JSObject()
            result.put("nearby", state?.toString() ?: "denied")
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Failed to check permissions: ${e.message}")
        }
    }

    /**
     * JS-callable method to request permissions explicitly.
     * Use this if you want to request permissions before advertising/discovery.
     */
    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        try {
            requestPermissionForAlias("nearby", call, "permissionsCallback")
        } catch (e: Exception) {
            call.reject("Failed to request permissions: ${e.message}")
        }
    }

    private fun ensurePermissionsForMethod(call: PluginCall) {
        try {
            val state = getPermissionState("nearby")
            if (state == PermissionState.GRANTED) {
                when (call.methodName) {
                    "startAdvertising" -> {
                        sessionStartTime = System.currentTimeMillis()
                        val displayName = call.getString("displayName")
                        implementation.startAdvertising(displayName, call)
                    }
                    "startDiscovery" -> {
                        sessionStartTime = System.currentTimeMillis()
                        implementation.startDiscovery(call)
                    }
                    else -> {
                        call.reject("Method ${call.methodName} not supported here.")
                    }
                }
            } else {
                requestPermissionForAlias("nearby", call, "permissionsCallback")
            }
        } catch (e: Exception) {
            call.reject("Permission check failed: ${e.message}")
        }
    }

    private fun getFileExtension(filePath: String): String {
        return try {
            val uri = Uri.parse(filePath)
            if (uri.scheme == "content") {
                val mimeType = context.contentResolver.getType(uri)
                mimeTypeToExtension(mimeType)
            } else {
                java.io.File(filePath).extension
            }
        } catch (e: Exception) {
            java.io.File(filePath).extension
        }
    }

    private fun mimeTypeToExtension(mimeType: String?): String {
        if (mimeType == null) return ""
        return when (mimeType.lowercase()) {
            "image/jpeg" -> "jpg"
            "image/png" -> "png"
            "image/gif" -> "gif"
            "image/webp" -> "webp"
            "image/bmp" -> "bmp"
            "image/svg+xml" -> "svg"
            "video/mp4" -> "mp4"
            "video/webm" -> "webm"
            "video/quicktime" -> "mov"
            "video/x-matroska" -> "mkv"
            "video/x-msvideo" -> "avi"
            "audio/mpeg" -> "mp3"
            "audio/wav" -> "wav"
            "audio/ogg" -> "ogg"
            "audio/flac" -> "flac"
            "audio/webm" -> "webm"
            "application/json" -> "json"
            "application/xml" -> "xml"
            "application/pdf" -> "pdf"
            "application/zip" -> "zip"
            "application/gzip" -> "gz"
            "application/x-tar" -> "tar"
            "application/x-rar-compressed" -> "rar"
            "application/msword" -> "doc"
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> "docx"
            "application/vnd.ms-excel" -> "xls"
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> "xlsx"
            "application/vnd.ms-powerpoint" -> "ppt"
            "application/vnd.openxmlformats-officedocument.presentationml.presentation" -> "pptx"
            "text/plain" -> "txt"
            "text/html" -> "html"
            "text/css" -> "css"
            "text/javascript" -> "js"
            "application/javascript" -> "js"
            "text/csv" -> "csv"
            else -> ""
        }
    }

    override fun load() {
        implementation.load(context, this)
    }

    fun emit(event: String, data: JSObject) {
        notifyListeners(event, data)
    }

    @PluginMethod
    fun initialize(call: PluginCall) {
        try {
            val serviceId = call.getString("serviceId") ?: return call.reject("serviceId is required")
            implementation.initialize(serviceId)
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Initialize failed: ${e.message}")
        }
    }

    @PluginMethod
    fun checkCapabilities(call: PluginCall) {
        try {
            val capabilities = implementation.checkCapabilities()
            val result = JSObject()
            result.put("platform", capabilities.platform)
            result.put("transferMethod", capabilities.transferMethod)
            result.put("supportsNearby", capabilities.supportsNearby)
            result.put("isEmulator", capabilities.isEmulator)
            capabilities.reason?.let { result.put("reason", it) }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Check capabilities failed: ${e.message}")
        }
    }

    @PluginMethod
    fun startAdvertising(call: PluginCall) {
        try {
            if (implementation.checkCapabilities().transferMethod == "lan") {
                sessionStartTime = System.currentTimeMillis()
                implementation.startAdvertising(call.getString("displayName"), call)
                return
            }
            ensurePermissionsForMethod(call)
        } catch (e: Exception) {
            call.reject("Start advertising failed: ${e.message}")
        }
    }

    @PluginMethod
    fun stopAdvertising(call: PluginCall) {
        try {
            sessionStartTime = 0
            implementation.stopAdvertising()
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Stop advertising failed: ${e.message}")
        }
    }

    @PluginMethod
    fun startDiscovery(call: PluginCall) {
        try {
            if (implementation.checkCapabilities().transferMethod == "lan") {
                sessionStartTime = System.currentTimeMillis()
                implementation.startDiscovery(call)
                return
            }
            ensurePermissionsForMethod(call)
        } catch (e: Exception) {
            call.reject("Start discovery failed: ${e.message}")
        }
    }

    @PluginMethod
    fun stopDiscovery(call: PluginCall) {
        try {
            sessionStartTime = 0
            implementation.stopDiscovery()
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Stop discovery failed: ${e.message}")
        }
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        try {
            val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
            val displayName = call.getString("displayName")
            implementation.connect(endpointId, displayName)
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Connect failed: ${e.message}")
        }
    }

    @PluginMethod
    fun acceptConnection(call: PluginCall) {
        try {
            val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
            implementation.acceptConnection(endpointId)
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Accept connection failed: ${e.message}")
        }
    }

    @PluginMethod
    fun rejectConnection(call: PluginCall) {
        try {
            val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
            implementation.rejectConnection(endpointId)
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Reject connection failed: ${e.message}")
        }
    }

    @PluginMethod
    fun disconnectFromEndpoint(call: PluginCall) {
        try {
            val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
            implementation.disconnectFromEndpoint(endpointId)
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Disconnect failed: ${e.message}")
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        try {
            implementation.disconnect()
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Disconnect failed: ${e.message}")
        }
    }

    @PluginMethod
    fun sendMessage(call: PluginCall) {
        try {
            val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
            val data = call.getString("data") ?: return call.reject("data is required")
            implementation.sendMessage(endpointId, data)
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Send message failed: ${e.message}")
        }
    }

    @PluginMethod
    fun sendFile(call: PluginCall) {
        try {
            val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
            val filePath = call.getString("filePath") ?: return call.reject("filePath is required")

            var fileName = call.getString("fileName")
            if (fileName.isNullOrBlank()) {
                val timestamp = System.currentTimeMillis()
                val uuid = java.util.UUID.randomUUID().toString().take(8)
                val extension = getFileExtension(filePath)
                fileName = if (extension.isNotEmpty()) "file_${timestamp}_${uuid}.$extension" else "file_${timestamp}_${uuid}"
            }

            val payloadId = implementation.sendFile(endpointId, filePath, fileName)
            call.resolve(JSObject().apply { put("payloadId", payloadId ?: fileName) })
        } catch (e: Exception) {
            call.reject("Send file failed: ${e.message}")
        }
    }

    @PluginMethod
    fun setLogLevel(call: PluginCall) {
        try {
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Set log level failed: ${e.message}")
        }
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        try {
            call.resolve(buildStateSnapshot())
        } catch (e: Exception) {
            call.reject("Get state failed: ${e.message}")
        }
    }

    @PluginMethod
    fun syncFromPlugin(call: PluginCall) {
        try {
            call.resolve(buildStateSnapshot())
        } catch (e: Exception) {
            call.reject("Sync from plugin failed: ${e.message}")
        }
    }

    private fun buildStateSnapshot(): JSObject {
        val result = JSObject()
        val endpoints = implementation.getDiscoveredEndpoints()
        val connectedEndpoints = implementation.getConnectedEndpoints()
        result.put("endpoints", endpoints)
        result.put("connectedEndpoints", connectedEndpoints)
        result.put("activeTransfers", JSObject())
        result.put("transferHistory", JSArray())
        result.put("stats", JSObject().put("totalBytesTransferred", 0).put("filesTransferred", 0).put("sessionStart", sessionStartTime).put("currentSpeedBps", 0))
        return result
    }
}
