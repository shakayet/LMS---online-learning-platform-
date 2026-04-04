import unlinkFile from './unlinkFile';

const normalize = (p?: string) => (p ? p.replace(/^\/+/, '') : '');

export const safeUnlinkDiff = (
  oldList: string[] = [],
  newList: string[] = []
): number => {
  const oldSet = new Set((oldList || []).filter(Boolean));
  const newSet = new Set((newList || []).filter(Boolean));
  let removed = 0;

  for (const file of oldSet) {
    if (!newSet.has(file)) {
      unlinkFile(normalize(file));
      removed += 1;
    }
  }

  return removed;
};

export default safeUnlinkDiff;
