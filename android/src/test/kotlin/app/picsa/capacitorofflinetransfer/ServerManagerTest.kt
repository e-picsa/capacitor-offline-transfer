package app.picsa.capacitorofflinetransfer

import android.content.Context
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

class ServerManagerTest {

    private lateinit var context: Context
    private lateinit var plugin: Plugin
    private lateinit var serverManager: ServerManager
    private lateinit var tempDir: File

    @Before
    fun setUp() {
        context = mockk(relaxed = true)
        plugin = mockk(relaxed = true)
        
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
