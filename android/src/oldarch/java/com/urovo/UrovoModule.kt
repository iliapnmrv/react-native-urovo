package com.urovo

import com.facebook.react.bridge.*

class UrovoModule(reactApplicationContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactApplicationContext) {
  private var implementation: UrovoModuleImpl = UrovoModuleImpl()

  override fun getName(): String = UrovoModuleImpl.NAME

  @ReactMethod
  fun openScanner(promise: Promise) {
    implementation.open(promise, reactApplicationContext)
  }
  
  @ReactMethod
  fun closeScanner(promise: Promise) {
    implementation.close(promise, reactApplicationContext)
  }
  
  @ReactMethod
  fun enableAllSymbologies(enable: Boolean) {
    implementation.enableAllSymbologies(enable)
  }
  
  @ReactMethod
  fun enableSymbologies(symbologies: ReadableArray, enable: Boolean, promise: Promise){
    implementation.enableSymbologies(symbologies, enable, promise)
  }

  @ReactMethod
  fun getParameters(ids: ReadableArray, promise: Promise){
    implementation.getParameters(ids, promise)
  }
  
  @ReactMethod
  fun setParameter(parameter: ReadableMap, promise: Promise){
    implementation.setParameter(parameter, promise)
  }
  
  @ReactMethod
  fun resetScannerParameters(promise: Promise){
    implementation.resetScannerParameters(promise)
  }

  @ReactMethod
  fun getConstants(): MutableMap<String, Any> {
    implementation.getConstants()
  }
  
  @ReactMethod
  fun addListener(eventName: String) {}
  
  @ReactMethod
  fun removeListeners(count: Double) {}
}