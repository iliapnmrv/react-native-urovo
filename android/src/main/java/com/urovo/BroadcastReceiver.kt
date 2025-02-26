package com.urovo

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import android.device.ScanManager.ACTION_DECODE
import android.device.ScanManager.BARCODE_STRING_TAG
import android.device.ScanManager.BARCODE_TYPE_TAG

class BeamBroadcastReceiver(private val reactContext: ReactContext) : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        ContextCompat.RECEIVER_NOT_EXPORTED

        if (ACTION_DECODE == intent?.action) {
            // 7. in https://en.urovo.com/developer/index.html
            val barcodeString: String? = intent.getStringExtra(BARCODE_STRING_TAG)
            val type: Byte = intent.getByteExtra(BARCODE_TYPE_TAG, 0.toByte())

            val params = Arguments.createMap().apply {
                putString("value", barcodeString)
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
