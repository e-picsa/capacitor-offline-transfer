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
import java.net.NetworkInterface
import java.net.InetAddress
import java.util.Collections

class ServerManagerTest : BaseTest() {
    private lateinit var context: Context
    private lateinit var plugin: Plugin
    private lateinit var serverManager: ServerManager
    private lateinit var tempDir: File

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        plugin = mockk(relaxed = true)
        
        // Custom NetworkInterface mocking for this test
        mockkStatic(NetworkInterface::class)
        val mockInterface = mockk<NetworkInterface>()
        val mockAddress = mockk<java.net.InetAddress>()
        every { mockAddress.isLoopbackAddress } returns false
        every { mockAddress.hostAddress } returns "127.0.0.1"
        every { mockInterface.displayName } returns "wlan0"
        every { mockInterface.inetAddresses } returns Collections.enumeration(listOf(mockAddress))
        every { NetworkInterface.getNetworkInterfaces() } returns Collections.enumeration(listOf(mockInterface))
        
        // Need to override the default text/plain for some tests
        mockMimeType("txt", "text/plain")
        
        // Setup a real temporary directory for file serving tests
        tempDir = File.createTempFile("servertest", "")
        tempDir.delete()
        tempDir.mkdir()
        
        every { context.filesDir } returns tempDir
        serverManager = ServerManager(context, plugin)
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
}
