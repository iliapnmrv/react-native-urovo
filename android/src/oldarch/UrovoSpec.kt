package com.urovo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise


abstract class UrovoSpec internal constructor(context: ReactApplicationContext): ReactContextBaseJavaModule(context) {

  abstract fun openScanner(promise: Promise, reactApplicationContext: ReactApplicationContext)

  abstract fun closeScanner(promise: Promise, reactApplicationContext: ReactApplicationContext)
}