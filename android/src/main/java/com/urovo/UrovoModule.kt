package com.urovo

import android.content.IntentFilter
import android.device.ScanManager
import android.util.Log
import com.facebook.react.bridge.*
import com.urovo.BeamBroadcastReceiver

class UrovoModule internal constructor(reactApplicationContext: ReactApplicationContext): UrovoSpec(reactApplicationContext) {
    private val scanner: ScanManager = ScanManager()
    
    private var receiver: BeamBroadcastReceiver? = null

    override fun getName(): String {
        return NAME
    }
    
    @ReactMethod
    override fun openScanner(promise: Promise) {
        try {
            scanner.openScanner()
            scanner.switchOutputMode(0)

            if (receiver == null) {
                receiver = BeamBroadcastReceiver(reactApplicationContext)
                val intentFilter = IntentFilter("android.intent.ACTION_DECODE_DATA")
                reactApplicationContext.registerReceiver(receiver, intentFilter)
            }

            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("OPEN_SCANNER_ERROR", t)
        }
    }

    @ReactMethod
    override fun closeScanner(promise: Promise) {
        try {
            scanner.stopDecode()
            scanner.closeScanner()

            receiver?.let {
                reactApplicationContext.unregisterReceiver(it)
                receiver = null
            }

            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("CLOSE_SCANNER_ERROR", t)
        }
    }

    @ReactMethod
    override fun addListener(eventName: String) {}

    @ReactMethod
    override fun  removeListeners(count: Double) {}

    companion object {
        const val NAME = "Urovo"
    }
}