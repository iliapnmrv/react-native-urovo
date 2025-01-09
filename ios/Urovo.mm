#import "Urovo.h"

@implementation Urovo
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(openScanner:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    resolve(nil);
}

RCT_EXPORT_METHOD(closeScanner:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject) {
    resolve(nil);
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventType) {
}

RCT_EXPORT_METHOD(removeListeners:(double)count) {
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeUrovoSpecJSI>(params);
}
#endif

@end
