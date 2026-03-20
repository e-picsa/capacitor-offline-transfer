package app.picsa.capacitorofflinetransfer

import android.util.Log
import android.webkit.MimeTypeMap
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkAll
import org.junit.After
import org.junit.Before

/**
 * Base class for Android unit tests that need to mock framework classes.
 * Since unitTests.returnDefaultValues = false, this class ensures
 * basic common classes like Log are always mocked.
 */
abstract class BaseTest {

    @Before
    fun baseSetUp() {
        // With unitTests.returnDefaultValues = true, Log methods return default values (0 for Int)
        // so we don't need to manually mock every call.
        
        // Mock MimeTypeMap by default as it's frequently used in this plugin
        mockkStatic(MimeTypeMap::class)
        val mimeMap = mockk<MimeTypeMap>(relaxed = true)
        every { MimeTypeMap.getSingleton() } returns mimeMap
        every { mimeMap.getMimeTypeFromExtension(any()) } returns "application/octet-stream"
    }

    @After
    fun baseTearDown() {
        // Safely unmock everything to prevent leakages between tests
        unmockkAll()
    }

    /**
     * Helper to mock MimeTypeMap for specific extensions.
     */
    protected fun mockMimeType(extension: String, mimeType: String) {
        val mimeMap = MimeTypeMap.getSingleton()
        every { mimeMap.getMimeTypeFromExtension(extension) } returns mimeType
    }
}
