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
    fun `connect emits expected events`() {
        // We use an asynchronous manager, so we need to wait or mock carefully.
        // For tests, we can verify that executor was called, but waiting for executor is tricky without a synchronous executor.
        // Let's replace the executor execution with synchronous in the test, or just use verify(timeout = 1000).
        
        manualManager.connect("http://localhost:8080", "Test User")

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
    fun `sendMessage executes POST request`() {
        mockkConstructor(URL::class)
        val mockConnection = mockk<HttpURLConnection>(relaxed = true)
        every { anyConstructed<URL>().openConnection() } returns mockConnection
        every { mockConnection.responseCode } returns 200

        val data = "Hello, Emulator!"
        manualManager.sendMessage("http://localhost:8080", data)

        // Wait for executor to run
        Thread.sleep(100)

        verify { mockConnection.requestMethod = "POST" }
        verify { mockConnection.doOutput = true }
        verify { mockConnection.outputStream }
        verify { mockConnection.disconnect() }
    }

    @Test
    fun `sendFile sends metadata via POST message`() {
        mockkConstructor(URL::class)
        val mockConnection = mockk<HttpURLConnection>(relaxed = true)
        every { anyConstructed<URL>().openConnection() } returns mockConnection
        every { mockConnection.responseCode } returns 200

        manualManager.sendFile("http://localhost:8080", "/path/to/test.jpg", "test.jpg")

        // Wait for executor
        Thread.sleep(100)

        verify { mockConnection.requestMethod = "POST" }
        // The output stream gets the metadata JSON string written to it
        verify { mockConnection.outputStream }
    }
}
