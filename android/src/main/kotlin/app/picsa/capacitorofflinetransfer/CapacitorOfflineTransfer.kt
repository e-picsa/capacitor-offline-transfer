package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.os.Build
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall

class CapacitorOfflineTransfer {
    private lateinit var context: Context
    private lateinit var plugin: Plugin
    private lateinit var nearbyManager: NearbyConnectionsManager
    private lateinit var hotspotManager: HotspotManager
    private lateinit var serverManager: ServerManager

    fun load(context: Context, plugin: Plugin) {
        this.context = context
        this.plugin = plugin
        nearbyManager = NearbyConnectionsManager(context, plugin)
        hotspotManager = HotspotManager(context, plugin)
        serverManager = ServerManager(context, plugin)
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

    fun acceptConnection(endpointId: String) {
        nearbyManager.acceptConnection(endpointId)
    }

    fun rejectConnection(endpointId: String) {
        nearbyManager.rejectConnection(endpointId)
    }

    fun disconnectFromEndpoint(endpointId: String) {
        nearbyManager.disconnectFromEndpoint(endpointId)
    }

    fun disconnect() {
        nearbyManager.disconnect()
    }

    fun sendMessage(endpointId: String, data: String) {
        nearbyManager.sendMessage(endpointId, data)
    }

    fun sendFile(endpointId: String, filePath: String, fileName: String) {
        nearbyManager.sendFile(endpointId, filePath, fileName)
    }

    fun startLocalHotspot(call: PluginCall) {
        hotspotManager.start(call)
    }

    fun stopLocalHotspot() {
        hotspotManager.stop()
    }

    fun startServer(port: Int, call: PluginCall) {
        serverManager.start(port, call)
    }

    fun stopServer() {
        serverManager.stop()
    }
}
