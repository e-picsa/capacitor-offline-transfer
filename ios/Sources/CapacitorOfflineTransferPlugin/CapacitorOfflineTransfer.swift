import Foundation
import MultipeerConnectivity
import Combine

protocol CapacitorOfflineTransferDelegate: AnyObject {
    func onConnectionRequested(endpointId: String, endpointName: String, authToken: String)
    func onConnectionResult(endpointId: String, status: String)
    func onEndpointFound(endpointId: String, endpointName: String, serviceId: String)
    func onEndpointLost(endpointId: String)
    func onMessageReceived(endpointId: String, data: String)
    func onTransferProgress(endpointId: String, payloadId: String, bytesTransferred: Int64, totalBytes: Int64, status: String)
    func onFileReceived(endpointId: String, payloadId: String, fileName: String, path: String)
}

@objc public class CapacitorOfflineTransfer: NSObject {
    weak var delegate: CapacitorOfflineTransferDelegate?
    private var progressCancellables = [String: AnyCancellable]()
    
    private var serviceType = "off-transfer"
    private var myPeerId: MCPeerID!
    private var myUniqueId: String!
    private var session: MCSession!
    private var advertiser: MCNearbyServiceAdvertiser?
    private var browser: MCNearbyServiceBrowser?
    
    private var peersDict = [String: MCPeerID]()
    private var discoveryDict = [String: MCPeerID]()
    private var invitations = [String: (MCPeerID, (Bool, MCSession?) -> Void)]()
    private var peerIdToEndpointIdMap = [MCPeerID: String]()
    
    func initialize(serviceId: String) {
        // serviceType must be 1-15 chars, only [a-z0-9] and hyphen
        self.serviceType = String(serviceId.prefix(15)).lowercased().filter { "abcdefghijklmnopqrstuvwxyz0123456789-".contains($0) }
        if self.serviceType.isEmpty { self.serviceType = "off-transfer" }
        
        myUniqueId = UUID().uuidString
    }
    
    func startAdvertising(displayName: String) {
        myPeerId = MCPeerID(displayName: displayName)
        session = MCSession(peer: myPeerId, securityIdentity: nil, encryptionPreference: .required)
        session.delegate = self
        
        let discoveryInfo = ["uid": myUniqueId]
        advertiser = MCNearbyServiceAdvertiser(peer: myPeerId, discoveryInfo: discoveryInfo, serviceType: serviceType)
        advertiser?.delegate = self
        advertiser?.startAdvertisingPeer()
    }
    
    func stopAdvertising() {
        advertiser?.stopAdvertisingPeer()
    }
    
    func startDiscovery() {
        if myPeerId == nil {
            myPeerId = MCPeerID(displayName: UIDevice.current.name)
        }
        if session == nil {
            session = MCSession(peer: myPeerId, securityIdentity: nil, encryptionPreference: .required)
            session.delegate = self
        }
        
        browser = MCNearbyServiceBrowser(peer: myPeerId, serviceType: serviceType)
        browser?.delegate = self
        browser?.startBrowsingForPeers()
    }
    
    func stopDiscovery() {
        browser?.stopBrowsingForPeers()
    }
    
    func connect(endpointId: String) {
        guard let peer = discoveryDict[endpointId] else { return }
        let context = myUniqueId.data(using: .utf8)
        peerIdToEndpointIdMap[peer] = endpointId
        browser?.invitePeer(peer, to: session, withContext: context, timeout: 30)
    }
    
    func acceptConnection(endpointId: String) {
        guard let (peer, invitationHandler) = invitations[endpointId] else { return }
        peerIdToEndpointIdMap[peer] = endpointId
        invitationHandler(true, session)
        invitations.removeValue(forKey: endpointId)
    }
    
    func rejectConnection(endpointId: String) {
        guard let (_, invitationHandler) = invitations[endpointId] else { return }
        invitationHandler(false, nil)
        invitations.removeValue(forKey: endpointId)
    }
    
    func disconnectFromEndpoint(endpointId: String) {
        // MCSession doesn't have a direct "disconnect from specific peer" that keeps the session alive for others cleanly,
        // but it will drop the peer if we don't handle it. Usually we just let it be or reset the session if needed.
    }
    
    func disconnect() {
        session?.disconnect()
    }
    
    func sendMessage(endpointId: String, data: String) {
        guard let peer = peersDict[endpointId] else { return }
        if let messageData = data.data(using: .utf8) {
            try? session.send(messageData, toPeers: [peer], with: .reliable)
        }
    }
    
    func sendFile(endpointId: String, filePath: String, fileName: String) {
        guard let peer = peersDict[endpointId] else { return }
        let fileURL = URL(fileURLWithPath: filePath)
        
        session.sendResource(at: fileURL, withName: fileName, toPeer: peer) { error in
            if let error = error {
                self.delegate?.onTransferProgress(endpointId: endpointId, payloadId: fileName, bytesTransferred: 0, totalBytes: 0, status: "FAILURE")
            }
        }
    }
}

extension CapacitorOfflineTransfer: MCSessionDelegate {
    func session(_ session: MCSession, peer peerID: MCPeerID, didChange state: MCSessionState) {
        let endpointId = peerIdToEndpointIdMap[peerID] ?? myUniqueId
        
        switch state {
        case .connected:
            peersDict[endpointId] = peerID
            delegate?.onConnectionResult(endpointId: endpointId, status: "SUCCESS")
        case .connecting:
            break
        case .notConnected:
            peersDict.removeValue(forKey: endpointId)
            peerIdToEndpointIdMap.removeValue(forKey: peerID)
            delegate?.onConnectionResult(endpointId: endpointId, status: "FAILURE")
            delegate?.onEndpointLost(endpointId: endpointId)
        @unknown default:
            break
        }
    }
    
    func session(_ session: MCSession, didReceive data: Data, fromPeer peerID: MCPeerID) {
        let endpointId = peerIdToEndpointIdMap[peerID] ?? myUniqueId
        if let message = String(data: data, encoding: .utf8) {
            delegate?.onMessageReceived(endpointId: endpointId, data: message)
        }
    }
    
    func session(_ session: MCSession, didReceive stream: InputStream, withName streamName: String, fromPeer peerID: MCPeerID) {
        // Not used for files in this implementation
    }
    
    func session(_ session: MCSession, didStartReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, with progress: Progress) {
        let endpointId = peerIdToEndpointIdMap[peerID] ?? myUniqueId
        
        let cancellable = progress.publisher(for: \.completedUnitCount)
            .sink { [weak self] completed in
                self?.delegate?.onTransferProgress(
                    endpointId: endpointId,
                    payloadId: resourceName,
                    bytesTransferred: completed,
                    totalBytes: progress.totalUnitCount,
                    status: "IN_PROGRESS"
                )
            }
        
        progressCancellables["\(endpointId)-\(resourceName)"] = cancellable
    }

    
    func session(_ session: MCSession, didFinishReceivingResourceWithName resourceName: String, fromPeer peerID: MCPeerID, at localURL: URL?, withError error: Error?) {
        let endpointId = peerIdToEndpointIdMap[peerID] ?? myUniqueId
        
        if let error = error {
            delegate?.onTransferProgress(endpointId: endpointId, payloadId: resourceName, bytesTransferred: 0, totalBytes: 0, status: "FAILURE")
            return
        }
        
        guard let localURL = localURL else { return }
        
        // Move to app's documents directory
        let fileManager = FileManager.default
        let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        let destinationURL = documentsURL.appendingPathComponent(resourceName)
        
        try? fileManager.removeItem(at: destinationURL)
        do {
            try fileManager.moveItem(at: localURL, to: destinationURL)
            delegate?.onFileReceived(endpointId: endpointId, payloadId: resourceName, fileName: resourceName, path: destinationURL.path)
            delegate?.onTransferProgress(endpointId: endpointId, payloadId: resourceName, bytesTransferred: 0, totalBytes: 0, status: "SUCCESS")
        } catch {
            delegate?.onTransferProgress(endpointId: endpointId, payloadId: resourceName, bytesTransferred: 0, totalBytes: 0, status: "FAILURE")
        }
    }
}

extension CapacitorOfflineTransfer: MCNearbyServiceAdvertiserDelegate {
    func advertiser(_ advertiser: MCNearbyServiceAdvertiser, didReceiveInvitationFromPeer peerID: MCPeerID, withContext context: Data?, invitationHandler: @escaping (Bool, MCSession?) -> Void) {
        var endpointId: String
        if let contextData = context, let remoteUid = String(data: contextData, encoding: .utf8) {
            endpointId = remoteUid
        } else {
            endpointId = UUID().uuidString
        }
        invitations[endpointId] = (peerID, invitationHandler)
        
        let authToken = context?.base64EncodedString() ?? ""
        delegate?.onConnectionRequested(endpointId: endpointId, endpointName: peerID.displayName, authToken: authToken)
    }
}

extension CapacitorOfflineTransfer: MCNearbyServiceBrowserDelegate {
    func browser(_ browser: MCNearbyServiceBrowser, foundPeer peerID: MCPeerID, withDiscoveryInfo info: [String : String]?) {
        guard let endpointId = info?["uid"] else { return }
        discoveryDict[endpointId] = peerID
        delegate?.onEndpointFound(endpointId: endpointId, endpointName: peerID.displayName, serviceId: serviceType)
    }
    
    func browser(_ browser: MCNearbyServiceBrowser, lostPeer peerID: MCPeerID) {
        // When a peer is lost, we don't have the endpointId directly from lostPeer
        // We need to search through discoveryDict to find and remove the peer
        if let endpointId = discoveryDict.first(where: { $0.value == peerID })?.key {
            discoveryDict.removeValue(forKey: endpointId)
            delegate?.onEndpointLost(endpointId: endpointId)
        }
    }
}
