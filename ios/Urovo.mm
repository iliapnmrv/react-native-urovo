#import "Urovo.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNUrovoSpec/RNUrovoSpec.h>
#endif

@implementation Urovo
RCT_EXPORT_MODULE()

- (void)openScanner:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    resolve(nil);
}

- (void)closeScanner:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    resolve(nil);
}

- (void)addListener:(NSString *)eventType {
}

- (void)removeListeners:(double)count {
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeUrovoSpecJSI>(params);
}
#endif

@end
