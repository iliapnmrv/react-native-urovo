package com.urovo

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.urovo.UrovoModuleImpl
import java.util.HashMap

class UrovoPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == UrovoModuleImpl.NAME) {
      UrovoModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {

      val isTurboModule: Boolean = com.urovo.BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      moduleInfos[UrovoModuleImpl.NAME] = ReactModuleInfo(
        UrovoModuleImpl.NAME,
        UrovoModuleImpl.NAME,
        false,  // canOverrideExistingModule
        false,  // needsEagerInit
        true,  // hasConstants
        false,  // isCxxModule
        isTurboModule // isTurboModule
      )
      moduleInfos
    }
  }
}
