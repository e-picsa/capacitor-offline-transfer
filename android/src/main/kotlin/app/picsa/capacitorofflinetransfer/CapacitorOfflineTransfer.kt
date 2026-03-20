package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.os.Build
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall

class CapacitorOfflineTransfer {
    private lateinit var context: Context
    private lateinit var plugin: CapacitorOfflineTransferPlugin
    private lateinit var nearbyManager: NearbyConnectionsManager
    private lateinit var lanClientManager: LanClientManager
    private lateinit var lanServerManager: LanServerManager

    fun load(context: Context, plugin: CapacitorOfflineTransferPlugin) {
        this.context = context
        this.plugin = plugin
        nearbyManager = NearbyConnectionsManager(context, plugin)
        lanClientManager = LanClientManager(context, plugin)
        lanServerManager = LanServerManager(context, plugin)
    }

    fun initialize(serviceId: String?) {
        val id = serviceId ?: context.packageName
        nearbyManager.initialize(id)
    }

    fun setStrategy(strategy: String) {
        nearbyManager.setStrategy(strategy)
    }

    fun startAdvertising(displayName: String?) {
        nearbyManager.startAdvertising(displayName ?: Build.MODEL)
    }

    fun stopAdvertising() {
        nearbyManager.stopAdvertising()
    }

    fun startDiscovery() {
        nearbyManager.startDiscovery()
    }

    fun stopDiscovery() {
        nearbyManager.stopDiscovery()
    }

    fun connect(endpointId: String, displayName: String?) {
        nearbyManager.connect(endpointId, displayName ?: Build.MODEL)
    }

    fun connectByAddress(url: String, displayName: String?) {
        lanClientManager.connect(url, displayName)
    }

    fun acceptConnection(endpointId: String) {
        nearbyManager.acceptConnection(endpointId)
    }

    fun rejectConnection(endpointId: String) {
        nearbyManager.rejectConnection(endpointId)
    }

    fun disconnectFromEndpoint(endpointId: String) {
        if (endpointId.startsWith("http")) {
            lanClientManager.disconnect(endpointId)
        } else {
            nearbyManager.disconnectFromEndpoint(endpointId)
        }
    }

    fun disconnect() {
        nearbyManager.disconnect()
    }

    fun sendMessage(endpointId: String, data: String) {
        if (endpointId.startsWith("http")) {
            lanClientManager.sendMessage(endpointId, data)
        } else {
            nearbyManager.sendMessage(endpointId, data)
        }
    }

    fun sendFile(endpointId: String, filePath: String, fileName: String) {
        if (endpointId.startsWith("http")) {
            lanClientManager.sendFile(endpointId, filePath, fileName)
        } else {
            nearbyManager.sendFile(endpointId, filePath, fileName)
        }
    }

    fun startLanServer(port: Int, call: PluginCall) {
        lanServerManager.start(port, call)
    }

    fun stopLanServer() {
        lanServerManager.stop()
    }
}
