import NativeUrovo from './NativeUrovo';
import {
  OutputMode,
  type PropertyID,
  type PropertyIdValue,
  type Symbology,
} from './types';

export type ScanResult = {
  value: string;
  type: number;
  symbology: Symbology;
};

export enum UROVO_EVENTS {
  ON_SCAN = 'ON_SCAN',
}

/** Opens the Urovo scanner in intent mode unless another mode is provided. */
export function openScanner(
  mode: OutputMode = OutputMode.INTENT
): Promise<boolean> | undefined {
  return NativeUrovo?.openScanner(mode);
}

export function switchOutputMode(
  mode: OutputMode
): Promise<boolean> | undefined {
  return NativeUrovo?.switchOutputMode(mode);
}

export function getOutputMode(): Promise<OutputMode> | undefined {
  return NativeUrovo?.getOutputMode() as Promise<OutputMode> | undefined;
}

export function closeScanner(): Promise<boolean> | undefined {
  return NativeUrovo?.closeScanner();
}

export function enableAllSymbologies(
  enable: boolean = true
): Promise<boolean> | undefined {
  return NativeUrovo?.enableAllSymbologies(enable);
}

export function getParameters(
  ids: PropertyID[]
): Promise<Partial<Record<PropertyID, PropertyIdValue>>> | undefined {
  return NativeUrovo?.getParameters(ids) as
    | Promise<Partial<Record<PropertyID, PropertyIdValue>>>
    | undefined;
}

export function resetScannerParameters(): Promise<boolean> | undefined {
  return NativeUrovo?.resetScannerParameters();
}

export type SetParameterArg = Partial<Record<PropertyID, PropertyIdValue>>;

export function setParameter(
  params: SetParameterArg
): Promise<boolean> | undefined {
  return NativeUrovo?.setParameter(params);
}

export function enableSymbologies(
  symbologies: Symbology[],
  enable: boolean = true
): Promise<boolean> | undefined {
  return NativeUrovo?.enableSymbologies(symbologies, enable);
}

export default NativeUrovo;
