import { DAY_MS } from '@/domain/time';
import { photosToDelete } from '@/features/scan/retention';

const now = 100 * DAY_MS;
const scan = (id: string, ageDays: number, status: string, photoUri: string | null = `file:///${id}.jpg`) => ({
  id,
  createdAt: now - ageDays * DAY_MS,
  photoUri,
  status,
});

describe('photosToDelete', () => {
  it('deletes photos once the review is finished', () => {
    expect(photosToDelete([scan('a', 0, 'done')], now)).toEqual([{ id: 'a', photoUri: 'file:///a.jpg' }]);
  });

  it('keeps a photo under review for up to 7 days, then deletes it anyway', () => {
    expect(photosToDelete([scan('b', 6.9, 'reviewing')], now)).toEqual([]);
    expect(photosToDelete([scan('c', 7, 'reviewing')], now)).toEqual([{ id: 'c', photoUri: 'file:///c.jpg' }]);
    expect(photosToDelete([scan('d', 30, 'captured')], now)).toHaveLength(1);
  });

  it('deletes photos from failed scans and ignores already-deleted ones', () => {
    expect(photosToDelete([scan('e', 0, 'failed'), scan('f', 50, 'done', null)], now)).toEqual([{ id: 'e', photoUri: 'file:///e.jpg' }]);
  });
});
