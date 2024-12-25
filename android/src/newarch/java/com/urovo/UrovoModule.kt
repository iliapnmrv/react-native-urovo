package com.urovo

import android.content.IntentFilter
import android.device.ScanManager
import android.util.Log
import com.facebook.react.bridge.*


class UrovoModule(reactContext: ReactApplicationContext) : NativeUrovoSpec(reactContext) {

    override fun getName() = UrovoModuleImpl.NAME

    override fun openScanner(promise: Promise) {
        UrovoModuleImpl.openScanner(promise, reactApplicationContext)
    }

    override fun closeScanner(promise: Promise) {
        UrovoModuleImpl.closeScanner(promise, reactApplicationContext)
    }

    override fun addListener(type: String) {
        // Keep: Required for RN built in Event Emitter Calls.
    }

    override fun removeListeners(count: Double) {
        // Keep: Required for RN built in Event Emitter Calls.
    }
}