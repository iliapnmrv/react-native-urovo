package com.urovo.scan

import android.content.IntentFilter
import android.device.ScanManager
import android.device.ScanManager.ACTION_DECODE
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.urovo.scan.broadcast.BeamBroadcastReceiver

class ScannerController(
    private val scanner: ScanManager
) {

    companion object {
        const val OUTPUT_MODE_INTENT = 0
    }

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

    fun switchOutputMode(mode: Int, reactContext: ReactApplicationContext): Boolean {
        val isSwitchSuccessful = scanner.switchOutputMode(mode)
        if (!isSwitchSuccessful) {
            return false
        }

        if (mode == OUTPUT_MODE_INTENT) {
            registerReceiverIfNeeded(reactContext)
        } else {
            unregisterReceiver(reactContext)
        }

        return true
    }

    fun getOutputMode(): Int = scanner.getOutputMode()

    fun registerReceiverIfNeeded(reactContext: ReactApplicationContext) {
        if (beamBroadcastReceiver == null) {
            val receiver = BeamBroadcastReceiver(reactContext)
            val filter = IntentFilter(ACTION_DECODE)
            ContextCompat.registerReceiver(
                reactContext,
                receiver,
                filter,
                ContextCompat.RECEIVER_EXPORTED
            )
            beamBroadcastReceiver = receiver
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
            try {
                reactContext.unregisterReceiver(it)
            } catch (ignored: IllegalArgumentException) {
                // The host may have already unregistered receivers during teardown.
            } finally {
                beamBroadcastReceiver = null
            }
        }
    }
}
