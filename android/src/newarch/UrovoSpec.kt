package com.urovo

import com.facebook.react.bridge.ReactApplicationContext

abstract class UrovoSpec internal constructor(context: ReactApplicationContext): NativeUrovoSpec(context) {}