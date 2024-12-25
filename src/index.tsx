import Urovo from './NativeUrovo';

export type ScanResult = {
  value: string;
  type: number;
};

export function openScanner() {
  return Urovo?.openScanner();
}

export function closeScanner() {
  return Urovo?.closeScanner();
}

export default Urovo;
