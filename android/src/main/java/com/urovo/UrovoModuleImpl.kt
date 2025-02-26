package com.urovo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Promise
import android.device.ScanManager
import android.util.Log
import android.content.IntentFilter
import com.urovo.BeamBroadcastReceiver
import java.util.logging.Logger
import android.device.ScanManager.ACTION_DECODE

class UrovoModuleImpl {
    private val scanner: ScanManager = ScanManager()

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
        var isSwitchSuccessful: Boolean
        try {
            isSwitchSuccessful = scanner.switchOutputMode(0)

            if (!isSwitchSuccessful) {
                // switch output mode failure is unexpected but is possible
                // throw error to react native side
                promise.reject("SWITCH_SCANNER_ERROR", "Could not switch output mode to intent")
            }
        }
        catch(t: Throwable) {
            promise.reject("SWITCH_SCANNER_ERROR", "Could not switch output mode to intent. Reason: ${t.message}")
        }
    }

    fun open(promise: Promise, reactApplicationContext: ReactApplicationContext) {
        try {
            val isOpenSuccessful: Boolean = this.openScanner()

            if (!isOpenSuccessful) {
                promise.resolve(isOpenSuccessful)
            }

            // switch output mode to intent
            this.switchOutputMode(promise)

            beamBroadcastReceiver = BeamBroadcastReceiver(reactApplicationContext)
            val filter = IntentFilter(ACTION_DECODE)
            reactApplicationContext.registerReceiver(beamBroadcastReceiver, filter)

            promise.resolve(isOpenSuccessful)
        } catch (t: Throwable) {
            promise.reject("OPEN_SCANNER_ERROR", t)
        }
    }

    fun close(promise: Promise, reactApplicationContext: ReactApplicationContext) {
        try {
            scanner.stopDecode()
            scanner.closeScanner()

            reactApplicationContext.unregisterReceiver(beamBroadcastReceiver)

            promise.resolve(true)
        } catch (t: Throwable) {
            promise.resolve(false)
            // promise.reject("CLOSE_SCANNER_ERROR", t)
        }
    }

    fun addListener(eventName: String) {}

    fun removeListeners(count: Double) {}

    companion object {
        const val NAME = "Urovo"
        var log: Logger = Logger.getLogger(UrovoModuleImpl::class.java.name  )
    }
}
