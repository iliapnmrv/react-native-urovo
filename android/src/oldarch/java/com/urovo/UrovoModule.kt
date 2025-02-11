package com.urovo

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class UrovoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private var implementation: UrovoModuleImpl = UrovoModuleImpl()

  override fun getName(): String = UrovoModuleImpl.NAME

  @ReactMethod
  fun openScanner(promise: Promise) {
    implementation.openScanner(promise, reactApplicationContext)
  }
  
  @ReactMethod
  fun closeScanner(promise: Promise) {
    implementation.closeScanner(promise, reactApplicationContext)
  }
}