package com.urovo;

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class BeamBroadcastReceiver(private val reactContext: ReactContext) : BroadcastReceiver() {
    private val barcodeTag: String = "barcode_string"
    private val action: String = "android.intent.ACTION_DECODE_DATA";

    override fun onReceive(context: Context, intent: Intent?) {
        if (action == intent?.action) {
            // 7. in https://en.urovo.com/developer/index.html
            val value = intent.getStringExtra(barcodeTag)
            val type = intent.getByteExtra("barcodeType", 0.toByte())

            val params = Arguments.createMap().apply {
                putString("value", value)
                putInt("type", type.toInt())
            }

            sendEvent(reactContext, "ON_SCAN", params)
        }
    }

    private fun sendEvent(reactContext: ReactContext, eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
