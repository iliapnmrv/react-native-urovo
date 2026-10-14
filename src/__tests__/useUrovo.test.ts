import { renderHook } from '@testing-library/react-native';
import { closeScanner, openScanner } from '../api';
import { useUrovo, type UseUrovoProps } from '../hooks/useUrovo';
import { OutputMode } from '../types';

const mockRemoveListener = jest.fn();
const mockAddListener = jest.fn(
  (_event: string, _listener: (scan: unknown) => void) => ({
    remove: mockRemoveListener,
  })
);

jest.mock('../api', () => ({
  closeScanner: jest.fn(),
  openScanner: jest.fn(),
  UROVO_EVENTS: { ON_SCAN: 'ON_SCAN' },
}));

jest.mock('../NativeUrovo', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('react-native', () => ({
  NativeEventEmitter: jest.fn(() => ({ addListener: mockAddListener })),
  Platform: { OS: 'android' },
}));

const mockOpenScanner = jest.mocked(openScanner);
const mockCloseScanner = jest.mocked(closeScanner);

describe('useUrovo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenScanner.mockResolvedValue(true);
    mockCloseScanner.mockResolvedValue(true);
  });

  it('opens the scanner, forwards scans and cleans up', async () => {
    const onScan = jest.fn();
    const hook = await renderHook(() => useUrovo({ onScan }));

    expect(mockOpenScanner).toHaveBeenCalledWith(OutputMode.INTENT);
    expect(hook.result.current.isScannerOpened).toBe(true);

    const scan = { value: '123', type: 31, symbology: 'QRCODE' };
    mockAddListener.mock.calls[0]?.[1]?.(scan);
    expect(onScan).toHaveBeenCalledWith(scan);

    await hook.unmount();

    expect(mockRemoveListener).toHaveBeenCalled();
    expect(mockCloseScanner).toHaveBeenCalled();
  });

  it('reopens the scanner when outputMode changes', async () => {
    const onScan = jest.fn();
    const hook = await renderHook((props: UseUrovoProps) => useUrovo(props), {
      initialProps: { onScan },
    });

    await hook.rerender({ onScan, outputMode: OutputMode.TEXTBOX });

    expect(mockOpenScanner).toHaveBeenNthCalledWith(1, OutputMode.INTENT);
    expect(mockOpenScanner).toHaveBeenNthCalledWith(2, OutputMode.TEXTBOX);

    await hook.unmount();
  });

  it('stays closed when opening fails', async () => {
    mockOpenScanner.mockRejectedValueOnce(new Error('unavailable'));

    const hook = await renderHook(() => useUrovo({ onScan: jest.fn() }));

    expect(hook.result.current.isScannerOpened).toBe(false);
    expect(mockAddListener).not.toHaveBeenCalled();

    await hook.unmount();
  });
});
