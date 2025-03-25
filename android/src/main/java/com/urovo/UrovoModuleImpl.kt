package com.urovo

import android.content.IntentFilter
import android.device.ScanManager
import android.device.ScanManager.ACTION_DECODE
import android.device.scanner.configuration.Symbology
import android.device.scanner.configuration.PropertyID
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.Arguments
import com.urovo.BeamBroadcastReceiver
import java.util.logging.Logger

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

            if (beamBroadcastReceiver == null) {
                beamBroadcastReceiver = BeamBroadcastReceiver(reactApplicationContext)
                val filter = IntentFilter(ACTION_DECODE)
                reactApplicationContext.registerReceiver(beamBroadcastReceiver, filter)
            }

            promise.resolve(isOpenSuccessful)
        } catch (t: Throwable) {
            promise.reject("OPEN_SCANNER_ERROR", t)
        }
    }

    fun getParameters(ids: ReadableArray, promise: Promise) {
        try {
println("123123")

            val propertyIds = IntArray(ids.size())
            for (i in 0 until ids.size()) {
                propertyIds[i] = ids.getInt(i)
            }

            val values = scanner.getParameterInts(propertyIds)

            val resultMap = Arguments.createMap()
    
            for (index in propertyIds.indices) {
                val propertyId = propertyIds[index]
                val propertyValue = values[index]

                resultMap.putInt(propertyId.toString(), propertyValue)
            }
    
            promise.resolve(resultMap)
        } catch (e: Throwable) {
            promise.reject("GET_PARAMETERS_ERROR", e)
        }
    }
    
    fun setParameters(params: ReadableMap, promise: Promise) {
        try {
            val propertyIds = mutableListOf<Int>()
            val propertyValues = mutableListOf<Int>()
    
            val iterator = params.keySetIterator()
            while (iterator.hasNextKey()) {
                val key = iterator.nextKey()
 
                val propertyId: Int = key.toInt()
                val value = params.getInt(key)
    
                propertyIds.add(propertyId)
                propertyValues.add(value)
            }
    
            scanner.setParameterInts(propertyIds.toIntArray(), propertyValues.toIntArray())
    
            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("SET_PARAMS_ERROR", t)
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

    fun enableAllSymbologies(enable: Boolean, promise: Promise){
        try {
            scanner.enableAllSymbologies(enable)
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("enableAllSymbologies error", e)
        }

    }

    fun enableSymbologies(symbologies: ReadableArray, enable: Boolean = true, promise: Promise) {
        try {
            for (i in 0 until symbologies.size()) {
                val barcodeType: Symbology = Symbology.valueOf(symbologies.getString(i) ?: "")

                val isSupported = scanner.isSymbologySupported(barcodeType)

                if(isSupported){
                    scanner.enableSymbology(barcodeType, enable)
                }
            }
        } catch (e: Throwable) {
            promise.reject("enableSymbologies error", e)
        }
    }
    

    fun addListener(eventName: String) {}

    fun removeListeners(count: Double) {}

    fun getConstants(): MutableMap<String, Any> {   
        return hashMapOf(
            "PropertyId" to "123"
        )
    }
    companion object {
        const val NAME = "Urovo"
        var LOG: Logger = Logger.getLogger(UrovoModuleImpl::class.java.name)
    }
}
