#ifdef RCT_NEW_ARCH_ENABLED
#import "RNUrovoSpec.h"

@interface Urovo : NSObject <NativeUrovoSpec>
#else
#import <React/RCTBridgeModule.h>

@interface Urovo : NSObject <RCTBridgeModule>
#endif

@end