package app.picsa.capacitorofflinetransfer

import android.content.Context
import com.getcapacitor.JSObject
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.nearby.connection.Strategy
import com.google.android.gms.tasks.Tasks
import io.mockk.*
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class NearbyConnectionsManagerTest {

    private lateinit var context: Context
    private lateinit var plugin: CapacitorOfflineTransferPlugin
    private lateinit var connectionsClient: ConnectionsClient
    private lateinit var manager: NearbyConnectionsManager

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        plugin = mockk(relaxed = true)
        connectionsClient = mockk(relaxed = true)
        
        mockkStatic(Nearby::class)
        every { Nearby.getConnectionsClient(any<Context>()) } returns connectionsClient
        
        manager = NearbyConnectionsManager(context, plugin)
    }

    @Test
    fun `initialize sets serviceId`() {
        manager.initialize("test-service")
        
        // serviceId is private, so we test it via startAdvertising
        every { connectionsClient.startAdvertising(any(), any(), any(), any()) } returns Tasks.forResult(null)
        
        manager.startAdvertising("test-display")
        
        verify {
            connectionsClient.startAdvertising(
                "test-display",
                "test-service",
                any(),
                any()
            )
        }
    }

    @Test
    fun `setStrategy updates strategy correctly`() {
        manager.setStrategy("P2P_STAR")
        
        every { connectionsClient.startDiscovery(any(), any(), any()) } returns Tasks.forResult(null)
        
        manager.startDiscovery()
        
        val optionsSlot = slot<DiscoveryOptions>()
        verify {
            connectionsClient.startDiscovery(
                any(),
                any(),
                capture(optionsSlot)
            )
        }
        
        assertEquals(Strategy.P2P_STAR, optionsSlot.captured.strategy)
    }

    @Test
    fun `stopAdvertising calls connectionsClient`() {
        manager.stopAdvertising()
        verify { connectionsClient.stopAdvertising() }
    }

    @Test
    fun `stopDiscovery calls connectionsClient`() {
        manager.stopDiscovery()
        verify { connectionsClient.stopDiscovery() }
    }

    @Test
    fun `disconnect calls stopAllEndpoints`() {
        manager.disconnect()
        verify { connectionsClient.stopAllEndpoints() }
    }
}
