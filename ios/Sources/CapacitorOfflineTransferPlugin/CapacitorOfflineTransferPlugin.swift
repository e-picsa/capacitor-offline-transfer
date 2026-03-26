import Foundation
import Capacitor

@objc(OfflineTransferPlugin)
public class CapacitorOfflineTransferPlugin: CAPPlugin, CAPBridgedPlugin, CapacitorOfflineTransferDelegate {
    public let identifier = "CapacitorOfflineTransferPlugin"
    public let jsName = "OfflineTransfer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startAdvertising", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopAdvertising", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startDiscovery", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopDiscovery", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acceptConnection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "rejectConnection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnectFromEndpoint", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendMessage", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendFile", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setLogLevel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncFromPlugin", returnType: CAPPluginReturnPromise)
    ]

    private let implementation = CapacitorOfflineTransfer()
    private var sessionStartTime: Int = 0

    public override func load() {
        implementation.delegate = self
    }

    @objc func initialize(_ call: CAPPluginCall) {
        do {
            guard let serviceId = call.getString("serviceId") else {
                call.reject("serviceId is required")
                return
            }
            implementation.initialize(serviceId: serviceId)
            call.resolve()
        } catch {
            call.reject("Initialize failed: \(error.localizedDescription)")
        }
    }

    @objc func checkCapabilities(_ call: CAPPluginCall) {
        do {
            let capabilities: [String: Any] = [
                "platform": "ios",
                "transferMethod": "nearby",
                "supportsNearby": true,
                "isEmulator": false
            ]
            call.resolve(capabilities)
        } catch {
            call.reject("Check capabilities failed: \(error.localizedDescription)")
        }
    }

    @objc func checkPermissions(_ call: CAPPluginCall) {
        do {
            let result: [String: Any] = [
                "nearby": "granted"
            ]
            call.resolve(result)
        } catch {
            call.reject("Check permissions failed: \(error.localizedDescription)")
        }
    }

    @objc func requestPermissions(_ call: CAPPluginCall) {
        do {
            let result: [String: Any] = [
                "nearby": "granted"
            ]
            call.resolve(result)
        } catch {
            call.reject("Request permissions failed: \(error.localizedDescription)")
        }
    }

    private func ensurePermissions(call: CAPPluginCall, onGranted: @escaping () -> Void) {
        do {
            onGranted()
        } catch {
            call.reject("Permission check failed: \(error.localizedDescription)")
        }
    }

    @objc func startAdvertising(_ call: CAPPluginCall) {
        do {
            ensurePermissions(call: call) {
                self.sessionStartTime = Int(Date().timeIntervalSince1970 * 1000)
                guard let displayName = call.getString("displayName") else {
                    call.reject("displayName is required")
                    return
                }
                self.implementation.startAdvertising(displayName: displayName)
                call.resolve()
            }
        } catch {
            call.reject("Start advertising failed: \(error.localizedDescription)")
        }
    }

    @objc func stopAdvertising(_ call: CAPPluginCall) {
        do {
            sessionStartTime = 0
            implementation.stopAdvertising()
            call.resolve()
        } catch {
            call.reject("Stop advertising failed: \(error.localizedDescription)")
        }
    }

    @objc func startDiscovery(_ call: CAPPluginCall) {
        do {
            ensurePermissions(call: call) {
                self.sessionStartTime = Int(Date().timeIntervalSince1970 * 1000)
                self.implementation.startDiscovery()
                call.resolve()
            }
        } catch {
            call.reject("Start discovery failed: \(error.localizedDescription)")
        }
    }

    @objc func stopDiscovery(_ call: CAPPluginCall) {
        do {
            sessionStartTime = 0
            implementation.stopDiscovery()
            call.resolve()
        } catch {
            call.reject("Stop discovery failed: \(error.localizedDescription)")
        }
    }

    @objc func connect(_ call: CAPPluginCall) {
        do {
            guard let endpointId = call.getString("endpointId") else {
                call.reject("endpointId is required")
                return
            }
            implementation.connect(endpointId: endpointId)
            call.resolve()
        } catch {
            call.reject("Connect failed: \(error.localizedDescription)")
        }
    }

    @objc func acceptConnection(_ call: CAPPluginCall) {
        do {
            guard let endpointId = call.getString("endpointId") else {
                call.reject("endpointId is required")
                return
            }
            implementation.acceptConnection(endpointId: endpointId)
            call.resolve()
        } catch {
            call.reject("Accept connection failed: \(error.localizedDescription)")
        }
    }

    @objc func rejectConnection(_ call: CAPPluginCall) {
        do {
            guard let endpointId = call.getString("endpointId") else {
                call.reject("endpointId is required")
                return
            }
            implementation.rejectConnection(endpointId: endpointId)
            call.resolve()
        } catch {
            call.reject("Reject connection failed: \(error.localizedDescription)")
        }
    }

    @objc func disconnectFromEndpoint(_ call: CAPPluginCall) {
        do {
            guard let endpointId = call.getString("endpointId") else {
                call.reject("endpointId is required")
                return
            }
            implementation.disconnectFromEndpoint(endpointId: endpointId)
            call.resolve()
        } catch {
            call.reject("Disconnect failed: \(error.localizedDescription)")
        }
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        do {
            implementation.disconnect()
            call.resolve()
        } catch {
            call.reject("Disconnect failed: \(error.localizedDescription)")
        }
    }

    @objc func sendMessage(_ call: CAPPluginCall) {
        do {
            guard let endpointId = call.getString("endpointId"),
                  let data = call.getString("data") else {
                call.reject("endpointId and data are required")
                return
            }
            implementation.sendMessage(endpointId: endpointId, data: data)
            call.resolve()
        } catch {
            call.reject("Send message failed: \(error.localizedDescription)")
        }
    }

    @objc func sendFile(_ call: CAPPluginCall) {
        do {
            guard let endpointId = call.getString("endpointId"),
                  let filePath = call.getString("filePath"),
                  let fileName = call.getString("fileName") else {
                call.reject("endpointId, filePath, and fileName are required")
                return
            }
            implementation.sendFile(endpointId: endpointId, filePath: filePath, fileName: fileName)
            call.resolve()
        } catch {
            call.reject("Send file failed: \(error.localizedDescription)")
        }
    }

    @objc func setLogLevel(_ call: CAPPluginCall) {
        do {
            call.resolve()
        } catch {
            call.reject("Set log level failed: \(error.localizedDescription)")
        }
    }

    @objc func getState(_ call: CAPPluginCall) {
        do {
            call.resolve(buildStateSnapshot())
        } catch {
            call.reject("Get state failed: \(error.localizedDescription)")
        }
    }

    @objc func syncFromPlugin(_ call: CAPPluginCall) {
        do {
            let snapshot = buildStateSnapshot()
            call.resolve(snapshot)
        } catch {
            call.reject("Sync from plugin failed: \(error.localizedDescription)")
        }
    }

    private func buildStateSnapshot() -> [String: Any] {
        let endpoints = implementation.getDiscoveredEndpoints()
        let connectedEndpoints = implementation.getConnectedEndpoints()
        return [
            "endpoints": endpoints,
            "connectedEndpoints": connectedEndpoints,
            "activeTransfers": [String: Any](),
            "transferHistory": [[String: Any]](),
            "stats": [
                "totalBytesTransferred": 0,
                "filesTransferred": 0,
                "sessionStart": sessionStartTime,
                "currentSpeedBps": 0
            ]
        ]
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
