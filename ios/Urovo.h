#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNUrovoSpec/RNUrovoSpec.h>
#endif

@interface Urovo: NSObject <RCTBridgeModule>

@end

#ifdef RCT_NEW_ARCH_ENABLED
@interface Urovo : NSObject <NativeUrovoSpec>

@end
#endif