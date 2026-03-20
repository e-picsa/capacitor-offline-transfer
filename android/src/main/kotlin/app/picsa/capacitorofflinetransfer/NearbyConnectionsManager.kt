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

class NearbyConnectionsManager(private val context: Context, private val plugin: CapacitorOfflineTransferPlugin) {

    private val TAG = "NearbyTransfer"
    private var serviceId: String = "picsa-offline"
    private var strategy: Strategy = Strategy.P2P_CLUSTER

    private val incomingPayloads = SimpleArrayMap<Long, Payload>()
    private val incomingFileMetadata = SimpleArrayMap<Long, String>()
    private val discoveredEndpoints = mutableMapOf<String, String>()
    private val connectedEndpoints = mutableMapOf<String, String>()

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
                put("authenticationToken", info.authenticationDigits)
                put("isIncomingConnection", info.isIncomingConnection)
            }
            plugin.emit("connectionRequested", event)
        }

        override fun onConnectionResult(endpointId: String, result: ConnectionResolution) {
            val status = when (result.status.statusCode) {
                ConnectionsStatusCodes.STATUS_OK -> "SUCCESS"
                ConnectionsStatusCodes.STATUS_CONNECTION_REJECTED -> "REJECTED"
                else -> "FAILURE"
            }
            if (status == "SUCCESS") {
                val name = discoveredEndpoints[endpointId] ?: endpointId
                connectedEndpoints[endpointId] = name
            } else {
                connectedEndpoints.remove(endpointId)
            }
            val event = JSObject().apply {
                put("endpointId", endpointId)
                put("status", status)
            }
            plugin.emit("connectionResult", event)
        }

        override fun onDisconnected(endpointId: String) {
            connectedEndpoints.remove(endpointId)
            val event = JSObject().apply {
                put("endpointId", endpointId)
            }
            plugin.emit("endpointLost", event)
        }
    }

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            discoveredEndpoints[endpointId] = info.endpointName
            val event = JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", info.endpointName)
                put("serviceId", info.serviceId)
            }
            plugin.emit("endpointFound", event)
        }

        override fun onEndpointLost(endpointId: String) {
            discoveredEndpoints.remove(endpointId)
            val event = JSObject().apply {
                put("endpointId", endpointId)
            }
            plugin.emit("endpointLost", event)
        }
    }

    private val payloadCallback = object : PayloadCallback() {
        override fun onPayloadReceived(endpointId: String, payload: Payload) {
            if (payload.type == Payload.Type.BYTES) {
                val data = String(payload.asBytes()!!)
                try {
                    val json = JSObject(data)
                    if (json.has("filePayloadId") && json.has("fileName")) {
                        val filePayloadId = json.getLong("filePayloadId")
                        val fileName = json.getString("fileName")
                        incomingFileMetadata.put(filePayloadId, fileName!!)
                        return
                    }
                } catch (e: org.json.JSONException) {
                    // Not a metadata JSON, treat as regular message.
                }
                val event = JSObject().apply {
                    put("endpointId", endpointId)
                    put("data", data)
                }
                plugin.emit("messageReceived", event)
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
            plugin.emit("transferProgress", event)

            if (update.status == PayloadTransferUpdate.Status.SUCCESS) {
                val payload = incomingPayloads.remove(update.payloadId)
                if (payload != null) {
                    val payloadFile = payload.asFile() ?: run {
                        Log.e(TAG, "Payload file is null for payload ${update.payloadId}")
                        return
                    }
                    val savedName = incomingFileMetadata.remove(update.payloadId)
                    val targetFile = File(context.filesDir, savedName ?: "received_${update.payloadId}")

                    val success = copyPayloadToFile(payloadFile, targetFile)

                    if (success) {
                        val receivedEvent = JSObject().apply {
                            put("endpointId", endpointId)
                            put("payloadId", update.payloadId.toString())
                            put("fileName", targetFile.name)
                            put("path", targetFile.absolutePath)
                        }
                        plugin.emit("fileReceived", receivedEvent)
                    } else {
                        Log.e(TAG, "Failed to copy received file to ${targetFile.absolutePath}")
                    }
                }
            } else if (update.status == PayloadTransferUpdate.Status.FAILURE || update.status == PayloadTransferUpdate.Status.CANCELED) {
                incomingPayloads.remove(update.payloadId)
            }
        }
    }

    fun startAdvertising(displayName: String) {
        val options = AdvertisingOptions.Builder().setStrategy(strategy).build()
        Nearby.getConnectionsClient(context)
            .startAdvertising(displayName, serviceId, connectionLifecycleCallback, options)
            .addOnFailureListener { e ->
                Log.e(TAG, "Advertising failed", e)
                plugin.emit("connectionResult", JSObject().apply {
                    put("endpointId", "local")
                    put("status", "FAILURE")
                    put("message", "Advertising failed: ${e.message}")
                })
            }
    }

    fun stopAdvertising() {
        Nearby.getConnectionsClient(context).stopAdvertising()
    }

    fun startDiscovery() {
        val options = DiscoveryOptions.Builder().setStrategy(strategy).build()
        Nearby.getConnectionsClient(context)
            .startDiscovery(serviceId, endpointDiscoveryCallback, options)
            .addOnFailureListener { e ->
                Log.e(TAG, "Discovery failed", e)
                plugin.emit("endpointLost", JSObject().apply {
                    put("endpointId", "local")
                    put("message", "Discovery failed: ${e.message}")
                })
            }
    }

    fun stopDiscovery() {
        Nearby.getConnectionsClient(context).stopDiscovery()
    }

    fun connect(endpointId: String, displayName: String) {
        Nearby.getConnectionsClient(context)
            .requestConnection(displayName, endpointId, connectionLifecycleCallback)
            .addOnFailureListener { e ->
                Log.e(TAG, "Connection request failed", e)
                plugin.emit("connectionResult", JSObject().apply {
                    put("endpointId", endpointId)
                    put("status", "FAILURE")
                    put("message", "Connection failed: ${e.message}")
                })
            }
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
            context.contentResolver.openFileDescriptor(uri, "r")?.use { pfd ->
                val filePayload = Payload.fromFile(pfd)
                val metadata = JSObject().apply {
                    put("filePayloadId", filePayload.id)
                    put("fileName", fileName)
                }
                val metadataPayload = Payload.fromBytes(metadata.toString().toByteArray())
                Nearby.getConnectionsClient(context).sendPayload(endpointId, metadataPayload)
                Nearby.getConnectionsClient(context).sendPayload(endpointId, filePayload)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send file", e)
            plugin.emit("transferProgress", JSObject().apply {
                put("endpointId", endpointId)
                put("payloadId", fileName)
                put("bytesTransferred", 0L)
                put("totalBytes", 0L)
                put("status", "FAILURE")
            })
        }
    }

    private fun copyPayloadToFile(payloadFile: Payload.File, targetFile: File): Boolean {
        return try {
            val uri = payloadFile.asUri() ?: return false
            context.contentResolver.openInputStream(uri)?.use { input ->
                targetFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            } ?: return false
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to copy payload to file", e)
            false
        }
    }

    fun getDiscoveredEndpoints(): JSObject {
        val result = JSObject()
        for ((id, name) in discoveredEndpoints) {
            val endpoint = JSObject().apply {
                put("endpointId", id)
                put("endpointName", name)
                put("serviceId", serviceId)
            }
            result.put(id, endpoint)
        }
        return result
    }

    fun getConnectedEndpoints(): JSObject {
        val result = JSObject()
        for ((id, name) in connectedEndpoints) {
            val endpoint = JSObject().apply {
                put("endpointId", id)
                put("endpointName", name)
                put("connectedAt", System.currentTimeMillis())
            }
            result.put(id, endpoint)
        }
        return result
    }
}
