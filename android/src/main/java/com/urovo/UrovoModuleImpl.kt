package com.urovo

import android.device.ScanManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReactApplicationContext
import com.urovo.scan.parameter.ParameterManager
import com.urovo.scan.symbology.SymbologyManager
import com.urovo.scan.ScannerController
import java.util.logging.Logger

class UrovoModuleImpl {

    private val scanner = ScanManager()

    private val scannerController = ScannerController(scanner)
    private val parameterManager = ParameterManager(scanner)
    private val symbologyManager = SymbologyManager(scanner)

    companion object {
        const val NAME = "Urovo"
        val LOG: Logger = Logger.getLogger(UrovoModuleImpl::class.java.name)
    }

    fun open(promise: Promise, reactCtx: ReactApplicationContext) {
        try {
            val opened = scannerController.openScanner()
            if (!opened) {
                promise.resolve(false)
                return
            }
            scannerController.switchOutputMode(promise)
            scannerController.registerReceiverIfNeeded(reactCtx)

            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("OPEN_SCANNER_ERROR", t)
        }
    }

    fun close(promise: Promise, reactCtx: ReactApplicationContext) {
        try {
            scannerController.closeScanner()
            scannerController.unregisterReceiver(reactCtx)
            promise.resolve(true)
        } catch (t: Throwable) {
            promise.resolve(false)
        }
    }

    fun getParameters(ids: ReadableArray, promise: Promise) {
        scanner?.let{    
            parameterManager.getParameters(ids, promise)
        }
    }

    fun setParameter(parameter: ReadableMap, promise: Promise) {
        scanner?.let{
            parameterManager.setParameter(parameter, promise)
        }
    }

    fun resetScannerParameters(promise: Promise) {
        scanner?.let{
            parameterManager.resetScannerParameters(promise)
        }
    }

    fun enableAllSymbologies(enable: Boolean, promise: Promise) {
        scanner?.let{
            symbologyManager.enableAllSymbologies(enable, promise)
        }
    }

    fun enableSymbologies(symbologies: ReadableArray, enable: Boolean, promise: Promise) {
        scanner?.let{
            symbologyManager.enableSymbologies(symbologies, enable, promise)
        }
    }

    // fun getConstants(): MutableMap<String, Any> {
    //     return hashMapOf("PropertyId" to "123")
    // }
}
