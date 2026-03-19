package app.picsa.capacitorofflinetransfer

import android.content.Context
import com.google.android.gms.nearby.Nearby
import com.google.android.gms.nearby.connection.AdvertisingOptions
import com.google.android.gms.nearby.connection.ConnectionsClient
import com.google.android.gms.nearby.connection.DiscoveryOptions
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import io.mockk.*
import org.junit.Before
import org.junit.Test

class NearbyConnectionsManagerTest {

    private lateinit var context: Context
    private lateinit var plugin: CapacitorOfflineTransferPlugin
    private lateinit var connectionsClient: ConnectionsClient
    private lateinit var manager: NearbyConnectionsManager

    @Suppress("UNCHECKED_CAST")
    private val mockVoidTask: Task<Void> = mockk(relaxed = true)

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        plugin = mockk(relaxed = true)
        connectionsClient = mockk(relaxed = true)

        mockkStatic(Nearby::class)
        every {
            Nearby.getConnectionsClient(any<Context>())
        } returns connectionsClient

        mockkStatic(Tasks::class)
        every { Tasks.forResult<Void>(any()) } returns mockVoidTask

        manager = NearbyConnectionsManager(context, plugin)
    }

    @Test
    fun `initialize sets serviceId`() {
        manager.initialize("test-service")

        every {
            connectionsClient.startAdvertising(
                any<String>(),
                any<String>(),
                any(),
                any<AdvertisingOptions>()
            )
        } returns mockVoidTask

        manager.startAdvertising("test-display")

        verify {
            connectionsClient.startAdvertising(
                "test-display",
                "test-service",
                any(),
                any<AdvertisingOptions>()
            )
        }
    }

    @Test
    fun `setStrategy updates strategy and is used in discovery`() {
        manager.setStrategy("P2P_STAR")

        every {
            connectionsClient.startDiscovery(
                any<String>(),
                any(),
                any<DiscoveryOptions>()
            )
        } returns mockVoidTask

        manager.startDiscovery()

        // Verify startDiscovery was called (strategy is embedded in the
        // DiscoveryOptions built internally — we can't inspect it in a
        // pure-JVM test because Strategy.P2P_STAR can't class-load here,
        // but we confirm the path executes without error).
        verify {
            connectionsClient.startDiscovery(
                any<String>(),
                any(),
                any<DiscoveryOptions>()
            )
        }
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