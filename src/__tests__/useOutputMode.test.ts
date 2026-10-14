import { act, renderHook } from '@testing-library/react-native';
import { getOutputMode, switchOutputMode } from '../api';
import { useOutputMode } from '../hooks/useOutputMode';
import { OutputMode } from '../types';

jest.mock('../api', () => ({
  getOutputMode: jest.fn(),
  switchOutputMode: jest.fn(),
}));

const mockGetOutputMode = jest.mocked(getOutputMode);
const mockSwitchOutputMode = jest.mocked(switchOutputMode);

describe('useOutputMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOutputMode.mockResolvedValue(OutputMode.INTENT);
    mockSwitchOutputMode.mockResolvedValue(true);
  });

  it('reads and changes the output mode', async () => {
    const hook = await renderHook(() => useOutputMode());

    expect(hook.result.current[0]).toBe(OutputMode.INTENT);

    await act(async () => {
      await hook.result.current[1](OutputMode.TEXTBOX);
    });

    expect(mockSwitchOutputMode).toHaveBeenCalledWith(OutputMode.TEXTBOX);
    expect(hook.result.current[0]).toBe(OutputMode.TEXTBOX);

    await hook.unmount();
  });

  it('keeps the previous mode when native switching fails', async () => {
    mockSwitchOutputMode.mockResolvedValueOnce(false);
    const hook = await renderHook(() => useOutputMode());

    await act(async () => {
      await hook.result.current[1](OutputMode.TEXTBOX);
    });

    expect(hook.result.current[0]).toBe(OutputMode.INTENT);

    await hook.unmount();
  });
});
