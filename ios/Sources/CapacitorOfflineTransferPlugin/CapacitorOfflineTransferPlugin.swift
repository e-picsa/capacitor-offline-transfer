import Foundation
import Capacitor

@objc(OfflineTransferPlugin)
public class CapacitorOfflineTransferPlugin: CAPPlugin, CAPBridgedPlugin, CapacitorOfflineTransferDelegate {
    public let identifier = "CapacitorOfflineTransferPlugin"
    public let jsName = "OfflineTransfer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setStrategy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startAdvertising", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopAdvertising", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startDiscovery", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopDiscovery", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connectByAddress", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acceptConnection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "rejectConnection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnectFromEndpoint", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendMessage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startLanServer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopLanServer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLogLevel", returnType: CAPPluginReturnPromise)
    ]

    private let implementation = CapacitorOfflineTransfer()

    public override func load() {
        implementation.delegate = self
    }

    @objc func initialize(_ call: CAPPluginCall) {
        guard let serviceId = call.getString("serviceId") else {
            call.reject("serviceId is required")
            return
        }
        implementation.initialize(serviceId: serviceId)
        call.resolve()
    }

    @objc func setStrategy(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func startAdvertising(_ call: CAPPluginCall) {
        guard let displayName = call.getString("displayName") else {
            call.reject("displayName is required")
            return
        }
        implementation.startAdvertising(displayName: displayName)
        call.resolve()
    }

    @objc func stopAdvertising(_ call: CAPPluginCall) {
        implementation.stopAdvertising()
        call.resolve()
    }

    @objc func startDiscovery(_ call: CAPPluginCall) {
        implementation.startDiscovery()
        call.resolve()
    }

    @objc func stopDiscovery(_ call: CAPPluginCall) {
        implementation.stopDiscovery()
        call.resolve()
    }

    @objc func connect(_ call: CAPPluginCall) {
        guard let endpointId = call.getString("endpointId") else {
            call.reject("endpointId is required")
            return
        }
        implementation.connect(endpointId: endpointId)
        call.resolve()
    }

    @objc func connectByAddress(_ call: CAPPluginCall) {
        call.reject("connectByAddress is only available on Android (dev tooling)")
    }

    @objc func acceptConnection(_ call: CAPPluginCall) {
        guard let endpointId = call.getString("endpointId") else {
            call.reject("endpointId is required")
            return
        }
        implementation.acceptConnection(endpointId: endpointId)
        call.resolve()
    }

    @objc func rejectConnection(_ call: CAPPluginCall) {
        guard let endpointId = call.getString("endpointId") else {
            call.reject("endpointId is required")
            return
        }
        implementation.rejectConnection(endpointId: endpointId)
        call.resolve()
    }

    @objc func disconnectFromEndpoint(_ call: CAPPluginCall) {
        guard let endpointId = call.getString("endpointId") else {
            call.reject("endpointId is required")
            return
        }
        implementation.disconnectFromEndpoint(endpointId: endpointId)
        call.resolve()
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        implementation.disconnect()
        call.resolve()
    }

    @objc func sendMessage(_ call: CAPPluginCall) {
        guard let endpointId = call.getString("endpointId"),
              let data = call.getString("data") else {
            call.reject("endpointId and data are required")
            return
        }
        implementation.sendMessage(endpointId: endpointId, data: data)
        call.resolve()
    }

    @objc func sendFile(_ call: CAPPluginCall) {
        guard let endpointId = call.getString("endpointId"),
              let filePath = call.getString("filePath"),
              let fileName = call.getString("fileName") else {
            call.reject("endpointId, filePath, and fileName are required")
            return
        }
        implementation.sendFile(endpointId: endpointId, filePath: filePath, fileName: fileName)
        call.resolve()
    }

    @objc func startLanServer(_ call: CAPPluginCall) {
        call.reject("LAN server is only available on Android (dev tooling)")
    }

    @objc func stopLanServer(_ call: CAPPluginCall) {
        call.reject("LAN server is only available on Android (dev tooling)")
    }

    @objc func setLogLevel(_ call: CAPPluginCall) {
        call.resolve()
    }

    public func onConnectionRequested(endpointId: String, endpointName: String, authToken: String) {
        notifyListeners("connectionRequested", data: [
            "endpointId": endpointId,
            "endpointName": endpointName,
            "authenticationToken": authToken,
            "isIncomingConnection": true
        ])
    }

    public func onConnectionResult(endpointId: String, status: String) {
        notifyListeners("connectionResult", data: [
            "endpointId": endpointId,
            "status": status
        ])
    }

    public func onEndpointFound(endpointId: String, endpointName: String, serviceId: String) {
        notifyListeners("endpointFound", data: [
            "endpointId": endpointId,
            "endpointName": endpointName,
            "serviceId": serviceId
        ])
    }

    public func onEndpointLost(endpointId: String) {
        notifyListeners("endpointLost", data: [
            "endpointId": endpointId
        ])
    }

    public func onMessageReceived(endpointId: String, data: String) {
        notifyListeners("messageReceived", data: [
            "endpointId": endpointId,
            "data": data
        ])
    }

    public func onTransferProgress(endpointId: String, payloadId: String, bytesTransferred: Int64, totalBytes: Int64, status: String) {
        notifyListeners("transferProgress", data: [
            "endpointId": endpointId,
            "payloadId": payloadId,
            "bytesTransferred": bytesTransferred,
            "totalBytes": totalBytes,
            "status": status
        ])
    }

    public func onFileReceived(endpointId: String, payloadId: String, fileName: String, path: String) {
        notifyListeners("fileReceived", data: [
            "endpointId": endpointId,
            "payloadId": payloadId,
            "fileName": fileName,
            "path": path
        ])
    }
}
