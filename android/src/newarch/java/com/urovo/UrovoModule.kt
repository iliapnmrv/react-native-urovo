package com.urovo

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

class UrovoModule(reactContext: ReactApplicationContext): NativeUrovoSpec(reactContext) {
  private var implementation: UrovoModuleImpl = UrovoModuleImpl()

  override fun getName(): String = UrovoModuleImpl.NAME

  override fun openScanner(promise: Promise) {
    implementation.open(promise, reactApplicationContext)
  }
  
  override fun closeScanner(promise: Promise) {
    implementation.open(promise, reactApplicationContext)
  }

  override fun addListener(eventName: String) {}
  
  override fun removeListeners(count: Double) {}
}