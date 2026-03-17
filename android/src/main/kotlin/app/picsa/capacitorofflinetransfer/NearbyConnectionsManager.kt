package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.collection.SimpleArrayMap
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.*
import java.io.File
import java.io.FileNotFoundException

class NearbyConnectionsManager(private val context: Context, private val plugin: Plugin) {

    private val TAG = "NearbyTransfer"
    private var serviceId: String = "com.picsa.offlinetransfer"
    private var strategy: Strategy = Strategy.P2P_CLUSTER

    private val incomingPayloads = SimpleArrayMap<Long, Payload>()
    private val outgoingPayloads = SimpleArrayMap<Long, Payload>()
    private val fileNames = SimpleArrayMap<Long, String>()

    fun initialize(serviceId: String) {
        this.serviceId = serviceId
    }

    fun setStrategy(strategyName: String) {
        strategy = when (strategyName) {
            "P2P_STAR" -> Strategy.P2P_STAR
            "P2P_POINT_TO_POINT" -> Strategy.P2P_POINT_TO_POINT
            else -> Strategy.P2P_CLUSTER
        }
    }

    private val connectionLifecycleCallback = object : ConnectionLifecycleCallback() {
        override fun onConnectionInitiated(endpointId: String, info: ConnectionInfo) {
            val event = JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", info.endpointName)
                put("authenticationToken", info.authenticationToken)
                put("isIncomingConnection", info.isIncomingConnection)
            }
            plugin.notifyListeners("connectionRequested", event)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            val status = when (result.status.statusCode) {
                ConnectionsStatusCodes.STATUS_OK -> "SUCCESS"
                ConnectionsStatusCodes.STATUS_CONNECTION_REJECTED -> "REJECTED"
                else -> "FAILURE"
            }
            val event = JSObject().apply {
                put("endpointId", endpointId)
                put("status", status)
            }
            plugin.notifyListeners("connectionResult", event)
        }

        override fun onDisconnected(endpointId: String) {
            val event = JSObject().apply {
                put("endpointId", endpointId)
            }
            plugin.notifyListeners("endpointLost", event)
        }
    }

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            val event = JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", info.endpointName)
                put("serviceId", info.serviceId)
            }
            plugin.notifyListeners("endpointFound", event)
        }

        override fun onEndpointLost(endpointId: String) {
            val event = JSObject().apply {
                put("endpointId", endpointId)
            }
            plugin.notifyListeners("endpointLost", event)
        }
    }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type == Payload.Type.BYTES) {
                val data = String(payload.asBytes()!!)
                val event = JSObject().apply {
                    put("endpointId", endpointId)
                    put("data", data)
                }
                plugin.notifyListeners("messageReceived", event)
            } else if (payload.type == Payload.Type.FILE) {
                incomingPayloads.put(payload.id, payload)
            }
        }

        override fun onPayloadTransferUpdate(endpointId: String, update: PayloadTransferUpdate) {
            val status = when (update.status) {
                PayloadTransferUpdate.Status.SUCCESS -> "SUCCESS"
                PayloadTransferUpdate.Status.FAILURE -> "FAILURE"
                PayloadTransferUpdate.Status.CANCELED -> "CANCELLED"
                else -> "IN_PROGRESS"
            }

            val event = JSObject().apply {
                put("endpointId", endpointId)
                put("payloadId", update.payloadId.toString())
                put("bytesTransferred", update.bytesTransferred)
                put("totalBytes", update.totalBytes)
                put("status", status)
            }
            plugin.notifyListeners("transferProgress", event)

            if (update.status == PayloadTransferUpdate.Status.SUCCESS) {
                val payload = incomingPayloads.remove(update.payloadId)
                if (payload != null && payload.type == Payload.Type.FILE) {
                    val file = payload.asFile()!!.asJavaFile()
                    val targetFile = File(context.filesDir, fileNames.get(update.payloadId) ?: "received_${update.payloadId}")
                    file?.renameTo(targetFile)
                    
                    val receivedEvent = JSObject().apply {
                        put("endpointId", endpointId)
                        put("payloadId", update.payloadId.toString())
                        put("fileName", targetFile.name)
                        put("path", targetFile.absolutePath)
                    }
                    plugin.notifyListeners("fileReceived", receivedEvent)
                }
            }
        }
    }

    fun startAdvertising(displayName: String) {
        val options = AdvertisingOptions.Builder().setStrategy(strategy).build()
        Nearby.getConnectionsClient(context)
            .startAdvertising(displayName, serviceId, connectionLifecycleCallback, options)
            .addOnFailureListener { e -> Log.e(TAG, "Advertising failed", e) }
    }

    fun stopAdvertising() {
        Nearby.getConnectionsClient(context).stopAdvertising()
    }

    fun startDiscovery() {
        val options = DiscoveryOptions.Builder().setStrategy(strategy).build()
        Nearby.getConnectionsClient(context)
            .startDiscovery(serviceId, endpointDiscoveryCallback, options)
            .addOnFailureListener { e -> Log.e(TAG, "Discovery failed", e) }
    }

    fun stopDiscovery() {
        Nearby.getConnectionsClient(context).stopDiscovery()
    }

    fun connect(endpointId: String, displayName: String) {
        Nearby.getConnectionsClient(context)
            .requestConnection(displayName, endpointId, connectionLifecycleCallback)
            .addOnFailureListener { e -> Log.e(TAG, "Connection request failed", e) }
    }

    fun acceptConnection(endpointId: String) {
        Nearby.getConnectionsClient(context).acceptConnection(endpointId, payloadCallback)
    }

    fun rejectConnection(endpointId: String) {
        Nearby.getConnectionsClient(context).rejectConnection(endpointId)
    }

    fun disconnectFromEndpoint(endpointId: String) {
        Nearby.getConnectionsClient(context).disconnectFromEndpoint(endpointId)
    }

    fun disconnect() {
        Nearby.getConnectionsClient(context).stopAllEndpoints()
    }

    fun sendMessage(endpointId: String, data: String) {
        val payload = Payload.fromBytes(data.toByteArray())
        Nearby.getConnectionsClient(context).sendPayload(endpointId, payload)
    }

    fun sendFile(endpointId: String, filePath: String, fileName: String) {
        try {
            val uri = Uri.parse(filePath)
            val pfd: ParcelFileDescriptor? = context.contentResolver.openFileDescriptor(uri, "r")
            if (pfd != null) {
                val filePayload = Payload.fromFile(pfd)
                fileNames.put(filePayload.id, fileName)
                Nearby.getConnectionsClient(context).sendPayload(endpointId, filePayload)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send file", e)
        }
    }
}
