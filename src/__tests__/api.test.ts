jest.mock('../NativeUrovo', () => ({
  __esModule: true,
  default: {
    openScanner: jest.fn(),
    closeScanner: jest.fn(),
    switchOutputMode: jest.fn(),
    getOutputMode: jest.fn(),
    enableAllSymbologies: jest.fn(),
    enableSymbologies: jest.fn(),
    getParameters: jest.fn(),
    setParameter: jest.fn(),
    resetScannerParameters: jest.fn(),
  },
}));

import NativeUrovo from '../NativeUrovo';
import Urovo, {
  closeScanner,
  enableAllSymbologies,
  enableSymbologies,
  getOutputMode,
  getParameters,
  openScanner,
  OutputMode,
  PropertyID,
  resetScannerParameters,
  setParameter,
  switchOutputMode,
  Symbology,
  UROVO_EVENTS,
} from '..';

const mockNativeUrovo = NativeUrovo as jest.Mocked<
  NonNullable<typeof NativeUrovo>
>;

describe('public API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the default native-module export', () => {
    expect(Urovo).toBe(mockNativeUrovo);
  });

  it('opens in intent mode by default', () => {
    openScanner();

    expect(mockNativeUrovo.openScanner).toHaveBeenCalledWith(OutputMode.INTENT);
  });

  it('forwards an explicit output mode', () => {
    openScanner(OutputMode.TEXTBOX);
    switchOutputMode(OutputMode.INTENT);

    expect(mockNativeUrovo.openScanner).toHaveBeenCalledWith(
      OutputMode.TEXTBOX
    );
    expect(mockNativeUrovo.switchOutputMode).toHaveBeenCalledWith(
      OutputMode.INTENT
    );
  });

  it('forwards scanner lifecycle and parameter calls', () => {
    const parameters = { [PropertyID.QRCODE_ENABLE]: 1 };

    closeScanner();
    getOutputMode();
    getParameters([PropertyID.QRCODE_ENABLE]);
    setParameter(parameters);
    resetScannerParameters();
    enableAllSymbologies();
    enableAllSymbologies(false);
    enableSymbologies([Symbology.QRCODE]);
    enableSymbologies([Symbology.CODE128], false);

    expect(mockNativeUrovo.closeScanner).toHaveBeenCalledTimes(1);
    expect(mockNativeUrovo.getOutputMode).toHaveBeenCalledTimes(1);
    expect(mockNativeUrovo.getParameters).toHaveBeenCalledWith([
      PropertyID.QRCODE_ENABLE,
    ]);
    expect(mockNativeUrovo.setParameter).toHaveBeenCalledWith(parameters);
    expect(mockNativeUrovo.resetScannerParameters).toHaveBeenCalledTimes(1);
    expect(mockNativeUrovo.enableAllSymbologies).toHaveBeenNthCalledWith(
      1,
      true
    );
    expect(mockNativeUrovo.enableAllSymbologies).toHaveBeenNthCalledWith(
      2,
      false
    );
    expect(mockNativeUrovo.enableSymbologies).toHaveBeenNthCalledWith(
      1,
      [Symbology.QRCODE],
      true
    );
    expect(mockNativeUrovo.enableSymbologies).toHaveBeenNthCalledWith(
      2,
      [Symbology.CODE128],
      false
    );
  });

  it('keeps stable enum and event values', () => {
    expect(OutputMode.INTENT).toBe(0);
    expect(OutputMode.TEXTBOX).toBe(1);
    expect(PropertyID.QRCODE_ENABLE).toBe(2832);
    expect(Symbology.QRCODE).toBe('QRCODE');
    expect(UROVO_EVENTS.ON_SCAN).toBe('ON_SCAN');
  });
});
