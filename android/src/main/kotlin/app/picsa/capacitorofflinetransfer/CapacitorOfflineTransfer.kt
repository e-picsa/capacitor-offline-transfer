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

    fun getDiscoveredEndpoints(): JSObject {
        return nearbyManager.getDiscoveredEndpoints()
    }

    fun getConnectedEndpoints(): JSObject {
        return nearbyManager.getConnectedEndpoints()
    }
}
