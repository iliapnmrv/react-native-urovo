package com.urovo.scan.symbology

import android.device.ScanManager
import android.device.scanner.configuration.Symbology
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray

class SymbologyManager(
    private val scanner: ScanManager
) {

    fun enableAllSymbologies(enable: Boolean, promise: Promise) {
        try {
            scanner.enableAllSymbologies(enable)
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("enableAllSymbologies error", e)
        }
    }

    fun enableSymbologies(symbologies: ReadableArray, enable: Boolean, promise: Promise) {
        try {
            for (i in 0 until symbologies.size()) {
                val type = Symbology.valueOf(symbologies.getString(i) ?: "")
                if (scanner.isSymbologySupported(type)) {
                    scanner.enableSymbology(type, enable)
                }
            }
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("enableSymbologies error", e)
        }
    }
}
