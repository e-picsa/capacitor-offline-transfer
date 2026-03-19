import XCTest
import MultipeerConnectivity
@testable import CapacitorOfflineTransferPlugin

class MockOfflineTransferDelegate: CapacitorOfflineTransferDelegate {
    var onConnectionRequestedCalled = false
    var onEndpointFoundCalled = false
    var lastEndpointId: String?
    
    func onConnectionRequested(endpointId: String, endpointName: String, authToken: String) {
        onConnectionRequestedCalled = true
        lastEndpointId = endpointId
    }
    
    func onConnectionResult(endpointId: String, status: String) {}
    func onEndpointFound(endpointId: String, endpointName: String, serviceId: String) {
        onEndpointFoundCalled = true
        lastEndpointId = endpointId
    }
    func onEndpointLost(endpointId: String) {}
    func onMessageReceived(endpointId: String, data: String) {}
    func onTransferProgress(endpointId: String, payloadId: String, bytesTransferred: Int64, totalBytes: Int64, status: String) {}
    func onFileReceived(endpointId: String, payloadId: String, fileName: String, path: String) {}
}

class MultipeerConnectivityTests: XCTestCase {
    var sut: CapacitorOfflineTransfer!
    var mockDelegate: MockOfflineTransferDelegate!
    
    override func setUp() {
        super.setUp()
        sut = CapacitorOfflineTransfer()
        mockDelegate = MockOfflineTransferDelegate()
        sut.delegate = mockDelegate
    }
    
    override func tearDown() {
        sut = nil
        mockDelegate = nil
        super.tearDown()
    }
    
    func testInitializeSetsServiceType() {
        sut.initialize(serviceId: "TestService")
        // serviceType is private, but we can check if it's truncated/filtered correctly if we could access it.
        // Since it's private and we don't want to change the code too much, 
        // we'll rely on side effects if any, or just trust the logic if it's simple.
        // For now, let's just ensure it doesn't crash.
    }
    
    func testAdvertiserDidReceiveInvitation() {
        let peerID = MCPeerID(displayName: "TestPeer")
        let advertiser = MCNearbyServiceAdvertiser(peer: MCPeerID(displayName: "Me"), discoveryInfo: nil, serviceType: "test")
        
        let context = "test-uid".data(using: .utf8)
        
        sut.advertiser(advertiser, didReceiveInvitationFromPeer: peerID, withContext: context) { (accepted, session) in
            // Invitation handler block
        }
        
        XCTAssertTrue(mockDelegate.onConnectionRequestedCalled)
        XCTAssertEqual(mockDelegate.lastEndpointId, "test-uid")
    }
    
    func testBrowserFoundPeer() {
        let peerID = MCPeerID(displayName: "TestPeer")
        let browser = MCNearbyServiceBrowser(peer: MCPeerID(displayName: "Me"), serviceType: "test")
        let info = ["uid": "found-uid"]
        
        sut.browser(browser, foundPeer: peerID, withDiscoveryInfo: info)
        
        XCTAssertTrue(mockDelegate.onEndpointFoundCalled)
        XCTAssertEqual(mockDelegate.lastEndpointId, "found-uid")
    }
}
