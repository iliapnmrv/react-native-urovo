import type { ScanResult } from 'react-native-urovo';

export type UseUrovoProps = {
  onScan: (result: ScanResult) => void;
  onOpen?: () => void;
};
