package app.picsa.capacitorofflinetransfer

import android.Manifest
import android.net.Uri
import android.os.Build
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission

@CapacitorPlugin(
    name = "OfflineTransfer",
    permissions = [
        Permission(
            alias = "nearby",
            strings = [
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.ACCESS_WIFI_STATE,
                Manifest.permission.CHANGE_WIFI_STATE,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.NEARBY_WIFI_DEVICES,
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN
            ]
        )
    ]
)
class CapacitorOfflineTransferPlugin : Plugin() {

    private val implementation = CapacitorOfflineTransfer()
    private var pendingPermissionCall: PluginCall? = null
    private var sessionStartTime: Long = 0

    @Suppress("DEPRECATION")
    override fun requestPermissions(call: PluginCall?) {
        if (call == null) return

        val permissionsToRequest = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.CHANGE_WIFI_STATE
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_SCAN)
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_ADVERTISE)
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
            permissionsToRequest.add(Manifest.permission.NEARBY_WIFI_DEVICES)
        } else {
            permissionsToRequest.add(Manifest.permission.BLUETOOTH)
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_ADMIN)
        }

        pendingPermissionCall = call
        val permissionStrings = permissionsToRequest.toTypedArray()
        pluginRequestPermissions(permissionStrings, PERMISSION_REQUEST_CODE)
    }

    @Deprecated("Use Capacitor 4+ permission APIs")
    @Suppress("DEPRECATION")
    override fun handleRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val savedCall = pendingPermissionCall
            if (savedCall != null) {
                val allGranted = grantResults.all { it == android.content.pm.PackageManager.PERMISSION_GRANTED }
                if (allGranted) {
                    savedCall.resolve()
                } else {
                    savedCall.reject("Permissions denied")
                }
                pendingPermissionCall = null
            }
        }
    }

    companion object {
        private const val PERMISSION_REQUEST_CODE = 1001
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
        val serviceId = call.getString("serviceId") ?: return call.reject("serviceId is required")
        implementation.initialize(serviceId)
        call.resolve()
    }

    @PluginMethod
    fun checkCapabilities(call: PluginCall) {
        val capabilities = implementation.checkCapabilities()
        val result = JSObject()
        result.put("platform", capabilities.platform)
        result.put("transferMethod", capabilities.transferMethod)
        result.put("supportsNearby", capabilities.supportsNearby)
        result.put("isEmulator", capabilities.isEmulator)
        capabilities.reason?.let { result.put("reason", it) }
        call.resolve(result)
    }

    @PluginMethod
    fun startAdvertising(call: PluginCall) {
        sessionStartTime = System.currentTimeMillis()
        val displayName = call.getString("displayName")
        implementation.startAdvertising(displayName)
        call.resolve()
    }

    @PluginMethod
    fun stopAdvertising(call: PluginCall) {
        sessionStartTime = 0
        implementation.stopAdvertising()
        call.resolve()
    }

    @PluginMethod
    fun startDiscovery(call: PluginCall) {
        sessionStartTime = System.currentTimeMillis()
        implementation.startDiscovery()
        call.resolve()
    }

    @PluginMethod
    fun stopDiscovery(call: PluginCall) {
        sessionStartTime = 0
        implementation.stopDiscovery()
        call.resolve()
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
        val displayName = call.getString("displayName")
        implementation.connect(endpointId, displayName)
        call.resolve()
    }

    @PluginMethod
    fun acceptConnection(call: PluginCall) {
        val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
        implementation.acceptConnection(endpointId)
        call.resolve()
    }

    @PluginMethod
    fun rejectConnection(call: PluginCall) {
        val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
        implementation.rejectConnection(endpointId)
        call.resolve()
    }

    @PluginMethod
    fun disconnectFromEndpoint(call: PluginCall) {
        val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
        implementation.disconnectFromEndpoint(endpointId)
        call.resolve()
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        implementation.disconnect()
        call.resolve()
    }

    @PluginMethod
    fun sendMessage(call: PluginCall) {
        val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
        val data = call.getString("data") ?: return call.reject("data is required")
        implementation.sendMessage(endpointId, data)
        call.resolve()
    }

    @PluginMethod
    fun sendFile(call: PluginCall) {
        val endpointId = call.getString("endpointId") ?: return call.reject("endpointId is required")
        val filePath = call.getString("filePath") ?: return call.reject("filePath is required")

        var fileName = call.getString("fileName")
        if (fileName.isNullOrBlank()) {
            val timestamp = System.currentTimeMillis()
            val uuid = java.util.UUID.randomUUID().toString().take(8)
            val extension = getFileExtension(filePath)
            fileName = if (extension.isNotEmpty()) "file_${timestamp}_${uuid}.$extension" else "file_${timestamp}_${uuid}"
        }

        implementation.sendFile(endpointId, filePath, fileName)
        call.resolve()
    }

    @PluginMethod
    fun setLogLevel(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        call.resolve(buildStateSnapshot())
    }

    @PluginMethod
    @PluginMethod
    fun syncFromPlugin(call: PluginCall) {
        call.resolve(buildStateSnapshot())
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
        call.resolve(result)
    }
}
