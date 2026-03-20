package app.picsa.capacitorofflinetransfer

import android.content.Context
import android.util.Log
import android.webkit.MimeTypeMap
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import io.mockk.*
import org.junit.After
import org.junit.Before
import org.junit.Test
import java.io.File
import java.net.URL
import java.net.HttpURLConnection
import java.net.InetAddress
import java.util.*

class ServerManagerTest : BaseTest() {
    private lateinit var context: Context
    private lateinit var plugin: CapacitorOfflineTransferPlugin
    private lateinit var serverManager: ServerManager
    private lateinit var tempDir: File

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        plugin = mockk<CapacitorOfflineTransferPlugin>(relaxed = true)
        
        // Need to override the default text/plain for some tests
        mockMimeType("txt", "text/plain")
        
        // Setup a real temporary directory for file serving tests
        tempDir = File.createTempFile("servertest", "")
        tempDir.delete()
        tempDir.mkdir()
        
        every { context.filesDir } returns tempDir
        
        // Use spyk to mock the internal IP address method without touching JDK NetworkInterface
        serverManager = spyk(ServerManager(context, plugin))
        every { serverManager.getLocalIpAddress() } returns "127.0.0.1"
    }

    @After
    fun tearDown() {
        serverManager.stop()
        tempDir.deleteRecursively()
    }

    @Test
    fun `server starts and responds to HTTP requests`() {
        val call = mockk<PluginCall>(relaxed = true)
        val portSlot = slot<JSObject>()
        
        // Start server on a random port
        serverManager.start(0, call)
        
        verify { call.resolve(capture(portSlot)) }
        
        val port = portSlot.captured.getInteger("port")
        val url = portSlot.captured.getString("url")
        
        // Create a test file
        val testFile = File(tempDir, "test.txt")
        testFile.writeText("Hello World")
        
        // Attempt to fetch the file
        val connection = URL("${url}test.txt").openConnection() as HttpURLConnection
        try {
            val responseText = connection.inputStream.bufferedReader().use { it.readText() }
            assert(responseText == "Hello World")
            assert(connection.responseCode == 200)
        } finally {
            connection.disconnect()
        }
    }

    @Test
    fun `server returns 404 for missing files`() {
        val call = mockk<PluginCall>(relaxed = true)
        val portSlot = slot<JSObject>()
        
        serverManager.start(0, call)
        
        verify { call.resolve(capture(portSlot)) }
        val url = portSlot.captured.getString("url")
        
        val connection = URL("${url}missing.txt").openConnection() as HttpURLConnection
        try {
            assert(connection.responseCode == 404)
        } finally {
            connection.disconnect()
        }
    }

    @Test
    fun `server handles POST message and emits event`() {
        val call = mockk<PluginCall>(relaxed = true)
        val portSlot = slot<JSObject>()
        
        serverManager.start(0, call)
        
        verify { call.resolve(capture(portSlot)) }
        val urlString = portSlot.captured.getString("url")
        val port = portSlot.captured.getInteger("port")
        
        val testMessage = "Test message body"
        
        val url = URL("${urlString}message")
        val connection = url.openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.doOutput = true
        connection.setRequestProperty("Content-Length", testMessage.length.toString())
        
        try {
            connection.outputStream.use { it.write(testMessage.toByteArray()) }
            
            assert(connection.responseCode == 200)
            
            // Verify event emission
            val eventSlot = slot<JSObject>()
            verify { plugin.emit("messageReceived", capture(eventSlot)) }
            
            assert(eventSlot.captured.getString("data") == testMessage)
            assert(eventSlot.captured.getString("endpointId") != null)
        } finally {
            connection.disconnect()
        }
    }
}
