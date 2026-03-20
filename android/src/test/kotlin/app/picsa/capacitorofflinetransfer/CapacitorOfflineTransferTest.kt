package app.picsa.capacitorofflinetransfer

import android.content.Context
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.lang.reflect.Field

class CapacitorOfflineTransferTest : BaseTest() {
    private lateinit var context: Context
    private lateinit var plugin: CapacitorOfflineTransferPlugin
    private lateinit var offlineTransfer: CapacitorOfflineTransfer

    private lateinit var mockNearbyManager: NearbyConnectionsManager
    private lateinit var mockManualManager: ManualConnectionManager

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        val appContext = mockk<Context>(relaxed = true)
        every { context.applicationContext } returns appContext
        
        val wifiManager = mockk<android.net.wifi.WifiManager>(relaxed = true)
        every { appContext.getSystemService(Context.WIFI_SERVICE) } returns wifiManager

        plugin = mockk(relaxed = true)
        offlineTransfer = CapacitorOfflineTransfer()
        offlineTransfer.load(context, plugin)

        // Inject mocks using reflection since they are private lateinit vars
        mockNearbyManager = mockk(relaxed = true)
        mockManualManager = mockk(relaxed = true)

        setPrivateField(offlineTransfer, "nearbyManager", mockNearbyManager)
        setPrivateField(offlineTransfer, "manualConnectionManager", mockManualManager)
    }

    @After
    fun tearDown() {
        io.mockk.unmockkAll()
    }

    private fun setPrivateField(target: Any, fieldName: String, value: Any) {
        val field: Field = target.javaClass.getDeclaredField(fieldName)
        field.isAccessible = true
        field.set(target, value)
    }

    @Test
    fun `sendMessage routes to manual manager for http endpoints`() {
        offlineTransfer.sendMessage("http://10.0.2.2:8080", "hello")
        
        verify { mockManualManager.sendMessage("http://10.0.2.2:8080", "hello") }
        verify(exactly = 0) { mockNearbyManager.sendMessage(any(), any()) }
    }

    @Test
    fun `sendMessage routes to nearby manager for standard endpoints`() {
        offlineTransfer.sendMessage("ABCD", "hello")
        
        verify { mockNearbyManager.sendMessage("ABCD", "hello") }
        verify(exactly = 0) { mockManualManager.sendMessage(any(), any()) }
    }

    @Test
    fun `sendFile routes to manual manager for http endpoints`() {
        offlineTransfer.sendFile("http://10.0.2.2:8080", "/path/test.txt", "test.txt")
        
        verify { mockManualManager.sendFile("http://10.0.2.2:8080", "/path/test.txt", "test.txt") }
        verify(exactly = 0) { mockNearbyManager.sendFile(any(), any(), any()) }
    }

    @Test
    fun `sendFile routes to nearby manager for standard endpoints`() {
        offlineTransfer.sendFile("ABCD", "/path/test.txt", "test.txt")
        
        verify { mockNearbyManager.sendFile("ABCD", "/path/test.txt", "test.txt") }
        verify(exactly = 0) { mockManualManager.sendFile(any(), any(), any()) }
    }
}
