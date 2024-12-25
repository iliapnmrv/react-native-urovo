package com.urovo

import android.content.IntentFilter
import android.device.ScanManager
import android.util.Log
import com.facebook.react.bridge.*

class UrovoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = UrovoModuleImpl.NAME

    @ReactMethod
    fun openScanner(promise: Promise) {
        UrovoModuleImpl.openScanner(promise, reactApplicationContext)
    }

    @ReactMethod
    fun closeScanner(promise: Promise) {
        UrovoModuleImpl.closeScanner(promise, reactApplicationContext)
    }

    // https://stackoverflow.com/a/69650217/16786307
    @ReactMethod
    fun addListener(type: String?) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    @ReactMethod
    fun removeListeners(type: Int?) {
        // Keep: Required for RN built in Event Emitter Calls.
    }
}
