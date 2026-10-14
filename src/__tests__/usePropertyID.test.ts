import { act, renderHook } from '@testing-library/react-native';
import { getParameters, setParameter } from '../api';
import { usePropertyID } from '../hooks/usePropertyID';
import { PropertyID, type PropertyIdValue } from '../types';

jest.mock('../api', () => ({
  getParameters: jest.fn(),
  setParameter: jest.fn(),
}));

const mockGetParameters = jest.mocked(getParameters);
const mockSetParameter = jest.mocked(setParameter);

describe('usePropertyID', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetParameters.mockResolvedValue({ [PropertyID.QRCODE_ENABLE]: 1 });
    mockSetParameter.mockResolvedValue(true);
  });

  it('reads and changes a scanner property', async () => {
    const hook = await renderHook(() =>
      usePropertyID(PropertyID.QRCODE_ENABLE)
    );

    expect(mockGetParameters).toHaveBeenCalledWith([PropertyID.QRCODE_ENABLE]);
    expect(hook.result.current[0]).toBe(1);

    await act(async () => {
      await hook.result.current[1](0 as PropertyIdValue);
    });

    expect(mockSetParameter).toHaveBeenCalledWith({
      [PropertyID.QRCODE_ENABLE]: 0,
    });
    expect(hook.result.current[0]).toBe(0);

    await hook.unmount();
  });

  it('keeps the previous value when native updating fails', async () => {
    mockSetParameter.mockResolvedValueOnce(false);
    const hook = await renderHook(() =>
      usePropertyID(PropertyID.QRCODE_ENABLE)
    );

    await act(async () => {
      await hook.result.current[1](0 as PropertyIdValue);
    });

    expect(hook.result.current[0]).toBe(1);

    await hook.unmount();
  });
});
