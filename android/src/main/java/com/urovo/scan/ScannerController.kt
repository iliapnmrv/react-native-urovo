package com.urovo.scan

import android.content.IntentFilter
import android.device.ScanManager
import android.device.ScanManager.ACTION_DECODE
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.urovo.scan.broadcast.BeamBroadcastReceiver

class ScannerController(
    private val scanner: ScanManager
) {

    private var beamBroadcastReceiver: BeamBroadcastReceiver? = null

    fun openScanner(): Boolean {
        var isOpenSuccessful: Boolean
        try {
            isOpenSuccessful = scanner.openScanner()
        } catch(t: Throwable) {
            // Urovo throws error if device does not have scanner module
            // do not throw it to react native side
            isOpenSuccessful = false
        }

        return isOpenSuccessful
    }

    fun switchOutputMode(promise: Promise) {
        try {
            val isSwitchSuccessful = scanner.switchOutputMode(0)
            if (!isSwitchSuccessful) {
                promise.reject("SWITCH_SCANNER_ERROR", "Could not switch output mode to intent")
            }
        } catch (t: Throwable) {
            promise.reject("SWITCH_SCANNER_ERROR", "Could not switch output mode to intent: ${t.message}")
        }
    }

    fun registerReceiverIfNeeded(reactContext: ReactApplicationContext) {
        if (beamBroadcastReceiver == null) {
            beamBroadcastReceiver = BeamBroadcastReceiver(reactContext)
            val filter = IntentFilter(ACTION_DECODE)
            reactContext.registerReceiver(beamBroadcastReceiver, filter)
        }
    }

    fun closeScanner() {
        try {
            scanner.stopDecode()
            scanner.closeScanner()
        } catch (ignore: Throwable) {
        }
    }

    fun unregisterReceiver(reactContext: ReactApplicationContext) {
        beamBroadcastReceiver?.let {
            reactContext.unregisterReceiver(it)
            beamBroadcastReceiver = null
        }
    }
}
