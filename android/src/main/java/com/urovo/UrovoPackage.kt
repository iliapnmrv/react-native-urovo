package com.urovo

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import java.util.HashMap

class UrovoPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == UrovoModule.NAME) {
      UrovoModule(reactContext)
    } else {
      null
    }
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {

      val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED

      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      moduleInfos[UrovoModule.NAME] = ReactModuleInfo(
        UrovoModule.NAME,
        UrovoModule.NAME,
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
