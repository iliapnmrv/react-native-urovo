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

    fun openScanner(promise: Promise, reactApplicationContext: ReactApplicationContext) {
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

    fun closeScanner(promise: Promise, reactApplicationContext: ReactApplicationContext) {
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

    fun addListener(eventName: String) {}

    fun  removeListeners(count: Double) {}

    companion object {
        const val NAME = "Urovo"
    }
}