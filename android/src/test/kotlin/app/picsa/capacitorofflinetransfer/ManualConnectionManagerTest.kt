package app.picsa.capacitorofflinetransfer

import android.content.Context
import com.getcapacitor.JSObject
import io.mockk.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL

class ManualConnectionManagerTest : BaseTest() {
    private lateinit var context: Context
    private lateinit var plugin: CapacitorOfflineTransferPlugin
    private lateinit var manualManager: ManualConnectionManager

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        plugin = mockk(relaxed = true)
        manualManager = ManualConnectionManager(context, plugin)
    }

    @After
    fun tearDown() {
        unmockkAll()
    }

    @Test
    fun `connect emits expected events on success`() {
        val spyManager = spyk(manualManager)
        val mockConnection = mockk<HttpURLConnection>(relaxed = true)
        every { spyManager.openConnection(any()) } returns mockConnection
        every { mockConnection.responseCode } returns 200

        spyManager.connect("http://localhost:8080", "Test User")

        val foundSlot = slot<JSObject>()
        val resultSlot = slot<JSObject>()

        verify(timeout = 1000) { 
            plugin.emit("endpointFound", capture(foundSlot)) 
            plugin.emit("connectionResult", capture(resultSlot))
        }

        assert(foundSlot.captured.getString("endpointId") == "http://localhost:8080")
        assert(foundSlot.captured.getString("endpointName") == "Test User")
        assert(foundSlot.captured.getString("serviceId") == "manual")

        assert(resultSlot.captured.getString("endpointId") == "http://localhost:8080")
        assert(resultSlot.captured.getString("status") == "SUCCESS")
    }

    @Test
    fun `connect emits failure when unreachable`() {
        val spyManager = spyk(manualManager)
        every { spyManager.openConnection(any()) } throws java.io.IOException("Connection refused")

        spyManager.connect("http://fake-url:9999", "Test User")

        val resultSlot = slot<JSObject>()

        verify(timeout = 1000) { 
            plugin.emit("connectionResult", capture(resultSlot))
        }

        assert(resultSlot.captured.getString("status") == "FAILURE")
        assert(resultSlot.captured.getString("message") == "Connection refused")
        
        // Ensure no endpointFound is emitted on failure
        verify(exactly = 0) { plugin.emit("endpointFound", any()) }
    }

    @Test
    fun `sendMessage executes POST request`() {
        val spyManager = spyk(manualManager)
        val mockConnection = mockk<HttpURLConnection>(relaxed = true)
        every { spyManager.openConnection(any()) } returns mockConnection
        every { mockConnection.responseCode } returns 200

        val data = "Hello, Emulator!"
        spyManager.sendMessage("http://localhost:8080", data)

        verify(timeout = 2000) { 
            mockConnection.requestMethod = "POST"
            mockConnection.doOutput = true
            mockConnection.outputStream
            mockConnection.disconnect()
        }
    }

    @Test
    fun `sendFile sends metadata via POST message`() {
        val spyManager = spyk(manualManager)
        val mockConnection = mockk<HttpURLConnection>(relaxed = true)
        every { spyManager.openConnection(any()) } returns mockConnection
        every { mockConnection.responseCode } returns 200

        spyManager.sendFile("http://localhost:8080", "/path/to/test.jpg", "test.jpg")

        verify(timeout = 2000) { 
            mockConnection.requestMethod = "POST"
            mockConnection.outputStream
        }
    }

    @Test
    fun `disconnect emits endpointLost event`() {
        manualManager.disconnect("http://localhost:8080")

        val lostSlot = slot<JSObject>()

        verify(timeout = 1000) { 
            plugin.emit("endpointLost", capture(lostSlot)) 
        }

        assert(lostSlot.captured.getString("endpointId") == "http://localhost:8080")
    }
}
