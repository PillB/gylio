/**
 * "Download my data": everything saved in this browser as one file (dataFile.ts), named by today's date.
 */
import { collectSnapshot } from './accountSync';
import { buildDataFile } from './dataFile';

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadDataFile(storage: Storage = localStorage): void {
  const stamp = new Date().toISOString();
  downloadText(`gylio-data-${stamp.slice(0, 10)}.json`, buildDataFile(collectSnapshot(storage), stamp));
}
