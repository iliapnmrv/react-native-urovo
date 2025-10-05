package com.urovo

import com.facebook.react.bridge.*

class UrovoModule(reactContext: ReactApplicationContext): NativeUrovoSpec(reactContext) {
  private var implementation: UrovoModuleImpl = UrovoModuleImpl()

  override fun getName(): String = UrovoModuleImpl.NAME

  override fun openScanner(mode: Double, promise: Promise) {
    implementation.open(mode.toInt(), promise, reactApplicationContext)
  }
  
  override fun switchOutputMode(mode: Double, promise: Promise) {
    implementation.switchOutputMode(mode.toInt(), promise, reactApplicationContext)
  }
  
  override fun getOutputMode(promise: Promise) {
    implementation.getOutputMode(promise)
  }
  
  override fun closeScanner(promise: Promise) {
    implementation.close(promise, reactApplicationContext)
  }
  
  override fun enableAllSymbologies(enable: Boolean, promise: Promise) {
    implementation.enableAllSymbologies(enable, promise)
  }

  override fun enableSymbologies(symbologies: ReadableArray, enable: Boolean, promise: Promise){
    implementation.enableSymbologies(symbologies, enable, promise)
  }
  
  override fun getParameters(ids: ReadableArray, promise: Promise){
    implementation.getParameters(ids, promise)
  }

  override fun setParameter(parameter: ReadableMap, promise: Promise){
    implementation.setParameter(parameter, promise)
  }

  override fun resetScannerParameters(promise: Promise){
    implementation.resetScannerParameters(promise)
  }

  override fun addListener(eventName: String) {}
  override fun removeListeners(count: Double) {}

  // override fun getTypedExportedConstants(): Map<String, Any> {
  //   return implementation.getConstants()
  // }
}
