package com.urovo

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

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
  fun getConstants(): MutableMap<String, Any> {
    implementation.getConstants()
  }
  
  @ReactMethod
  fun addListener(eventName: String) {}
  
  @ReactMethod
  fun removeListeners(count: Double) {}
}