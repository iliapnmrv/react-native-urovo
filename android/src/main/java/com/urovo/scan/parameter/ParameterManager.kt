package com.urovo.scan.parameter

import android.device.ScanManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

class ParameterManager(
    private val scanner: ScanManager
) {

    fun getParameters(ids: ReadableArray, promise: Promise) {
        try {
            val propertyIds = IntArray(ids.size()) {
                ids.getInt(it)
            }
            val values = scanner.getParameterInts(propertyIds)

            val resultMap = Arguments.createMap()
            for (i in propertyIds.indices) {
                resultMap.putInt(propertyIds[i].toString(), values[i])
            }
            promise.resolve(resultMap)
        } catch (e: Throwable) {
            promise.reject("GET_PARAMETERS_ERROR", e)
        }
    }

    fun setParameter(parameter: ReadableMap, promise: Promise) {
        try {
            val propertyIds = mutableListOf<Int>()
            val propertyValues = mutableListOf<Int>()
            val iterator = parameter.keySetIterator()

            while (iterator.hasNextKey()) {
                val key = iterator.nextKey()
                val propertyId = key.toInt()
                val value = parameter.getInt(key)
                propertyIds.add(propertyId)
                propertyValues.add(value)
            }

            scanner.setParameterInts(propertyIds.toIntArray(), propertyValues.toIntArray())
            promise.resolve(true)
        } catch (t: Throwable) {
            promise.reject("SET_PARAMS_ERROR", t)
        }
    }

    fun resetScannerParameters(promise: Promise) {
        try {
            val ret = scanner.resetScannerParameters()
            promise.resolve(ret)
        } catch (e: Throwable) {
            promise.reject("RESET_SCANNER_PARAMETERS_ERROR", e)
        }
    }
}
