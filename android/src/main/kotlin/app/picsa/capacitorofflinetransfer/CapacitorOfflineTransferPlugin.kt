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
/**
 * Capacitor plugin for offline file transfer using Android Nearby Connections API.
 *
 * ## Permission Handling
 *
 * Android requires different permissions based on API level:
     * - API 21+ (Lollipop): ACCESS_COARSE_LOCATION for Wi-Fi scanning
 * - API 31+ (Android 12): BLUETOOTH_SCAN, BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT
 * - API 32+ (Android 12L): NEARBY_WIFI_DEVICES for Wi-Fi Aware/SoftAP
 *
 * The plugin automatically checks and requests permissions before starting
 * advertising or discovery to ensure a smooth user experience.
 *
 * ## Auto-Permission Flow
 *
 * 1. User calls startAdvertising() or startDiscovery()
 * 2. checkAndRequestPermissions() checks if "nearby" permission is already granted
 * 3. If granted → proceed immediately
 * 4. If not granted → request permissions from user
 * 5. If user denies → reject the call with "Permissions denied"
 * 6. If user grants → proceed with the native operation
 */
class CapacitorOfflineTransferPlugin : Plugin() {

    private val implementation = CapacitorOfflineTransfer()
    /** Holds the pending plugin call while waiting for permission result */
    private var pendingPermissionCall: PluginCall? = null
    /** Callback to execute after permissions are granted */
    private var pendingPermissionOnGranted: (() -> Unit)? = null
    private var sessionStartTime: Long = 0

    companion object {
        /** Request code for permission result callback */
        private const val PERMISSION_REQUEST_CODE = 1001
    }

    /**
     * Builds the permission list based on Android API level.
     *
     * Required permissions by API level:
     * - API < 31: BLUETOOTH, BLUETOOTH_ADMIN (legacy)
     * - API 31+: BLUETOOTH_SCAN, BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT
     * - API 32+: NEARBY_WIFI_DEVICES (replaces some location permissions)
     * - All: ACCESS_COARSE_LOCATION (approximate only), WIFI permissions
     */
    private fun requestPermissionsWithCall(call: PluginCall) {
        val permissionsToRequest = mutableListOf(
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.ACCESS_WIFI_STATE,
            Manifest.permission.CHANGE_WIFI_STATE
        )

        // API 31+ (Android 12): New Bluetooth permissions model
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_SCAN)
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_ADVERTISE)
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_CONNECT)
        }

        // API 32+ (Android 12L): NEARBY_WIFI_DEVICES replaces some legacy permissions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S_V2) {
            permissionsToRequest.add(Manifest.permission.NEARBY_WIFI_DEVICES)
        } else {
            // API < 31: Legacy Bluetooth permissions
            permissionsToRequest.add(Manifest.permission.BLUETOOTH)
            permissionsToRequest.add(Manifest.permission.BLUETOOTH_ADMIN)
        }

        pendingPermissionCall = call
        val permissionStrings = permissionsToRequest.toTypedArray()
        pluginRequestPermissions(permissionStrings, PERMISSION_REQUEST_CODE)
    }

    /**
     * Handles the result of permission request.
     *
     * This override is deprecated in Capacitor 4+ but kept for compatibility.
     * For Capacitor 4+, use getPermissionStates() instead.
     */
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
            val onGranted = pendingPermissionOnGranted
            pendingPermissionCall = null
            pendingPermissionOnGranted = null

            if (savedCall != null) {
                val allGranted = grantResults.all { it == android.content.pm.PackageManager.PERMISSION_GRANTED }
                if (allGranted && onGranted != null) {
                    // Permission granted - execute the pending operation
                    onGranted()
                } else {
                    // Permission denied - reject the call
                    savedCall.reject("Permissions denied")
                }
            }
        }
    }

    /**
     * Checks if permissions are granted and requests them if needed.
     * This is called automatically before startAdvertising/startDiscovery.
     *
     * @param call The plugin call to reject if permissions denied
     * @param onGranted Callback to execute when permissions are granted
     */
    private fun checkAndRequestPermissions(call: PluginCall, onGranted: () -> Unit) {
        val permStates = getPermissionStates()
        val nearbyStatus = permStates["nearby"]

        if (nearbyStatus != null && nearbyStatus.toString() == "granted") {
            onGranted()
            return
        }

        pendingPermissionCall = call
        pendingPermissionOnGranted = onGranted
        requestPermissionsWithCall(call)
    }

    /**
     * JS-callable method to check permission status.
     * Returns: { nearby: "granted" | "denied" | "prompt" }
     */
    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        val permStates = getPermissionStates()
        val result = JSObject()
        result.put("nearby", permStates["nearby"]?.toString() ?: "denied")
        call.resolve(result)
    }

    /**
     * JS-callable method to request permissions explicitly.
     * Use this if you want to request permissions before advertising/discovery.
     */
    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        if (call == null) {
            return
        }
        requestPermissionsWithCall(call)
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

    /**
     * Starts advertising to nearby devices using Nearby Connections API.
     *
     * Automatically checks and requests permissions before starting.
     * If permissions are denied, rejects with "Permissions denied".
     */
    @PluginMethod
    fun startAdvertising(call: PluginCall) {
        checkAndRequestPermissions(call) {
            sessionStartTime = System.currentTimeMillis()
            val displayName = call.getString("displayName")
            implementation.startAdvertising(displayName)
            call.resolve()
        }
    }

    @PluginMethod
    fun stopAdvertising(call: PluginCall) {
        sessionStartTime = 0
        implementation.stopAdvertising()
        call.resolve()
    }

    /**
     * Starts discovering nearby devices using Nearby Connections API.
     *
     * Automatically checks and requests permissions before starting.
     * If permissions are denied, rejects with "Permissions denied".
     */
    @PluginMethod
    fun startDiscovery(call: PluginCall) {
        checkAndRequestPermissions(call) {
            sessionStartTime = System.currentTimeMillis()
            implementation.startDiscovery()
            call.resolve()
        }
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
        return result
    }
}
