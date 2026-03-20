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

class NearbyConnectionsManager(private val context: Context, private val plugin: CapacitorOfflineTransferPlugin) {

    private val TAG = "NearbyTransfer"
    private var serviceId: String = "picsa-offline"
    private var strategy: Strategy = Strategy.P2P_CLUSTER

    private val incomingPayloads = SimpleArrayMap<Long, Payload>()
    private val outgoingPayloads = SimpleArrayMap<Long, Payload>()
    private val fileNames = SimpleArrayMap<Long, String>()
    private val incomingFileMetadata = SimpleArrayMap<Long, String>()

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
            val event = JSObject().apply {
                put("endpointId", endpointId)
                put("status", status)
            }
            plugin.emit("connectionResult", event)
        }

        override fun onDisconnected(endpointId: String) {
            val event = JSObject().apply {
                put("endpointId", endpointId)
            }
            plugin.emit("endpointLost", event)
        }
    }

    private val endpointDiscoveryCallback = object : EndpointDiscoveryCallback() {
        override fun onEndpointFound(endpointId: String, info: DiscoveredEndpointInfo) {
            val event = JSObject().apply {
                put("endpointId", endpointId)
                put("endpointName", info.endpointName)
                put("serviceId", info.serviceId)
            }
            plugin.emit("endpointFound", event)
        }

        override fun onEndpointLost(endpointId: String) {
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
                    // Not a metadata JSON, so ignore and proceed to treat as a regular message.
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
                val payloadFile = payload?.asFile()
                if (payloadFile != null) {
                    val targetFile = File(context.filesDir, incomingFileMetadata.remove(update.payloadId) ?: "received_${update.payloadId}")
                    
                    @Suppress("DEPRECATION")
                    val sourceFile = payloadFile.asJavaFile()
                    val success = if (sourceFile != null) {
                        sourceFile.renameTo(targetFile)
                    } else {
                        copyPayloadToTarget(payloadFile, targetFile)
                    }

                    if (success) {
                        val receivedEvent = JSObject().apply {
                            put("endpointId", endpointId)
                            put("payloadId", update.payloadId.toString())
                            put("fileName", targetFile.name)
                            put("path", targetFile.absolutePath)
                        }
                        plugin.emit("fileReceived", receivedEvent)
                    } else {
                        Log.e(TAG, "Failed to move/copy received file to ${targetFile.absolutePath}")
                    }
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
            context.contentResolver.openFileDescriptor(uri, "r")?.use { pfd ->
                val filePayload = Payload.fromFile(pfd)
                fileNames.put(filePayload.id, fileName)
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
        }
    }

    private fun copyPayloadToTarget(payloadFile: Payload.File, targetFile: File): Boolean {
        return try {
            val uri = payloadFile.asUri() ?: return false

            context.contentResolver.openInputStream(uri)?.use { input ->
                targetFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            } ?: return false // Return false if the input stream is null

            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to copy payload to target", e)
            false
        }
    }
}
