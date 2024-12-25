
package com.urovo

import android.content.IntentFilter
import android.device.ScanManager
import android.util.Log
import com.facebook.react.bridge.*
import com.urovo.BeamBroadcastReceiver


class UrovoModuleImpl {
    companion object {
        val NAME: String = "Urovo"

        private val scanner: ScanManager = ScanManager()
    
        private var receiver: BeamBroadcastReceiver? = null
    
        @ReactMethod
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
    
        @ReactMethod
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
    }
}
