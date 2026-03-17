package app.picsa.capacitorofflinetransfer

import android.annotation.SuppressLint
import android.content.Context
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall

class HotspotManager(private val context: Context, private val plugin: Plugin) {

    private val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
    private var hotspotReservation: WifiManager.LocalOnlyHotspotReservation? = null

    @SuppressLint("MissingPermission")
    fun start(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            wifiManager.startLocalOnlyHotspot(object : WifiManager.LocalOnlyHotspotCallback() {
                override fun onStarted(reservation: WifiManager.LocalOnlyHotspotReservation) {
                    super.onStarted(reservation)
                    hotspotReservation = reservation
                    val config = reservation.wifiConfiguration
                    if (config != null) {
                        val ret = JSObject().apply {
                            put("ssid", config.SSID)
                            put("password", config.preSharedKey)
                        }
                        call.resolve(ret)
                    } else {
                        call.reject("Failed to get hotspot configuration")
                    }
                }

                override fun onStopped() {
                    super.onStopped()
                    hotspotReservation = null
                }

                override fun onFailed(reason: Int) {
                    super.onFailed(reason)
                    call.reject("Hotspot failed to start: $reason")
                }
            }, Handler(Looper.getMainLooper()))
        } else {
            call.reject("Hotspot API requires Android Oreo (8.0) or higher")
        }
    }

    fun stop() {
        hotspotReservation?.close()
        hotspotReservation = null
    }
}
