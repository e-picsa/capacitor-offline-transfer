package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall

data class PlatformCapabilities(
    val platform: String,
    val transferMethod: String,
    val supportsNearby: Boolean,
    val isEmulator: Boolean,
    val reason: String? = null
)

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

    fun checkCapabilities(): PlatformCapabilities {
        val isEmulator = detectEmulator()
        val sdkInt = Build.VERSION.SDK_INT

        return if (isEmulator) {
            PlatformCapabilities(
                platform = "android",
                transferMethod = "lan",
                supportsNearby = false,
                isEmulator = true,
                reason = "Nearby API unavailable on emulator"
            )
        } else if (sdkInt < 21) {
            PlatformCapabilities(
                platform = "android",
                transferMethod = "none",
                supportsNearby = false,
                isEmulator = false,
                reason = "Android SDK too old (minimum: 21)"
            )
        } else {
            PlatformCapabilities(
                platform = "android",
                transferMethod = "nearby",
                supportsNearby = true,
                isEmulator = false,
            )
        }
    }

    private fun detectEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT
        val brand = Build.BRAND.lowercase()
        val device = Build.DEVICE.lowercase()
        val model = Build.MODEL.lowercase()
        val manufacturer = Build.MANUFACTURER.lowercase()
        val product = Build.PRODUCT.lowercase()

        if (fingerprint.contains("generic") || fingerprint.contains("emulator")) {
            return true
        }

        if (brand == "android") {
            val emulatorDevices = listOf("goldfish", "ranchu", "sdk_gphone", "emulator", "generic")
            for (emulatorDevice in emulatorDevices) {
                if (device.contains(emulatorDevice) || product.contains(emulatorDevice)) {
                    return true
                }
            }
        }

        if (manufacturer == "google" && model.contains("sdk")) {
            return true
        }

        if (brand == "generic" && device == "generic") {
            return true
        }

        return false
    }

    fun startAdvertising(displayName: String?, call: PluginCall) {
        val caps = checkCapabilities()
        if (caps.transferMethod == "lan") {
            lanServerManager.start(8080, call)
        } else {
            nearbyManager.startAdvertising(displayName ?: Build.MODEL)
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    fun stopAdvertising() {
        lanServerManager.stop()
        nearbyManager.stopAdvertising()
    }

    fun startDiscovery(call: PluginCall) {
        val caps = checkCapabilities()
        if (caps.transferMethod == "lan") {
            // Emulators don't "discover", they just wait for manual connect via URL
            call.resolve(JSObject().apply { put("success", true) })
        } else {
            nearbyManager.startDiscovery()
            call.resolve(JSObject().apply { put("success", true) })
        }
    }

    fun stopDiscovery() {
        nearbyManager.stopDiscovery()
    }

    fun connect(endpointId: String, displayName: String?) {
        val caps = checkCapabilities()
        if (caps.transferMethod == "lan") {
            lanClientManager.connect(endpointId, displayName)
        } else {
            nearbyManager.connect(endpointId, displayName ?: Build.MODEL)
        }
    }

    fun acceptConnection(endpointId: String) {
        if (checkCapabilities().transferMethod != "lan") {
            nearbyManager.acceptConnection(endpointId)
        }
    }

    fun rejectConnection(endpointId: String) {
        if (checkCapabilities().transferMethod != "lan") {
            nearbyManager.rejectConnection(endpointId)
        }
    }

    fun disconnectFromEndpoint(endpointId: String) {
        val caps = checkCapabilities()
        if (caps.transferMethod == "lan") {
            lanClientManager.disconnect(endpointId)
        } else {
            nearbyManager.disconnectFromEndpoint(endpointId)
        }
    }

    fun disconnect() {
        lanServerManager.stop()
        nearbyManager.disconnect()
    }

    fun sendMessage(endpointId: String, data: String) {
        val caps = checkCapabilities()
        if (caps.transferMethod == "lan") {
            lanClientManager.sendMessage(endpointId, data)
        } else {
            nearbyManager.sendMessage(endpointId, data)
        }
    }

    fun sendFile(endpointId: String, filePath: String, fileName: String): String? {
        val caps = checkCapabilities()
        return if (caps.transferMethod == "lan") {
            lanClientManager.sendFile(endpointId, filePath, fileName)
            fileName
        } else {
            nearbyManager.sendFile(endpointId, filePath, fileName)
        }
    }

    fun getDiscoveredEndpoints(): JSObject {
        return nearbyManager.getDiscoveredEndpoints()
    }

    fun getConnectedEndpoints(): JSObject {
        return nearbyManager.getConnectedEndpoints()
    }
}
