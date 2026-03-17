package app.picsa.capacitorofflinetransfer

import android.Manifest
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.permissionutil.PermissionHelper

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
                Manifest.permission.NEARBY_WIFI_DEVICES
            ]
        )
    ]
)
class CapacitorOfflineTransferPlugin : Plugin() {

    private val implementation = CapacitorOfflineTransfer()

    override fun requestPermissions(call: PluginCall?) {
        // Nearby Connections requires different Bluetooth permissions based on API level:
        // - API 31+ (Android 12+): BLUETOOTH_SCAN, BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT, NEARBY_WIFI_DEVICES
        // - API 30 and below: legacy BLUETOOTH and BLUETOOTH_ADMIN permissions
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

        val permissionStrings = permissionsToRequest.toTypedArray()
        PermissionHelper.requestPermissions(this, call, permissionStrings, "nearby")
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
    fun setStrategy(call: PluginCall) {
        val strategy = call.getString("strategy") ?: "P2P_CLUSTER"
        implementation.setStrategy(strategy)
        call.resolve()
    }

    @PluginMethod
    fun startAdvertising(call: PluginCall) {
        val displayName = call.getString("displayName")
        implementation.startAdvertising(displayName)
        call.resolve()
    }

    @PluginMethod
    fun stopAdvertising(call: PluginCall) {
        implementation.stopAdvertising()
        call.resolve()
    }

    @PluginMethod
    fun startDiscovery(call: PluginCall) {
        implementation.startDiscovery()
        call.resolve()
    }

    @PluginMethod
    fun stopDiscovery(call: PluginCall) {
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
            val extension = filePath.substringAfterLast('.', "")
            fileName = if (extension.isNotEmpty()) "file_${timestamp}_${uuid}.$extension" else "file_${timestamp}_${uuid}"
        }
        
        implementation.sendFile(endpointId, filePath, fileName)
        call.resolve()
    }

    @PluginMethod
    fun startLocalHotspot(call: PluginCall) {
        implementation.startLocalHotspot(call)
    }

    @PluginMethod
    fun stopLocalHotspot(call: PluginCall) {
        implementation.stopLocalHotspot()
        call.resolve()
    }

    @PluginMethod
    fun startServer(call: PluginCall) {
        val port = call.getInt("port") ?: 0
        implementation.startServer(port, call)
    }

    @PluginMethod
    fun stopServer(call: PluginCall) {
        implementation.stopServer()
        call.resolve()
    }

    @PluginMethod
    fun setLogLevel(call: PluginCall) {
        // Implementation for log level if needed
        call.resolve()
    }
}
