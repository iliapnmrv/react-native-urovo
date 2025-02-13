package com.urovo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Promise
import android.device.ScanManager
import android.util.Log
import android.content.IntentFilter
import com.urovo.BeamBroadcastReceiver

class UrovoModuleImpl {
    private val scanner: ScanManager = ScanManager()

    private var receiver: BeamBroadcastReceiver? = null

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

            if (receiver == null) {
                receiver = BeamBroadcastReceiver(reactApplicationContext)
                val intentFilter = IntentFilter("android.intent.ACTION_DECODE_DATA")
                reactApplicationContext.registerReceiver(receiver, intentFilter)
            }

            promise.resolve(isOpenSuccessful)
        } catch (t: Throwable) {
            promise.reject("OPEN_SCANNER_ERROR", t)
        }
    }

    fun close(promise: Promise, reactApplicationContext: ReactApplicationContext) {
        try {
            scanner.stopDecode()
            scanner.closeScanner()

            receiver?.let {
                reactApplicationContext.unregisterReceiver(it)
                receiver = null
            }

            promise.resolve(true)
        } catch (t: Throwable) {
            promise.resolve(false)
            // promise.reject("CLOSE_SCANNER_ERROR", t)
        }
    }

    fun addListener(eventName: String) {}

    fun  removeListeners(count: Double) {}

    companion object {
        const val NAME = "Urovo"
    }
}
