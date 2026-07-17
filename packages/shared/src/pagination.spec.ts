import { normalizePagination, buildPaginatedResult } from './pagination';

describe('normalizePagination', () => {
  it('applies defaults', () => {
    const r = normalizePagination({});
    expect(r.page).toBe(1);
    expect(r.pageSize).toBe(20);
    expect(r.skip).toBe(0);
    expect(r.take).toBe(20);
  });

  it('clamps oversized page sizes to the maximum', () => {
    expect(normalizePagination({ pageSize: 5000 }).pageSize).toBe(100);
  });

  it('floors and guards against sub-1 values', () => {
    expect(normalizePagination({ page: 0, pageSize: 0 }).page).toBe(1);
    expect(normalizePagination({ page: 3, pageSize: 10 }).skip).toBe(20);
  });
});

describe('buildPaginatedResult', () => {
  it('computes meta correctly', () => {
    const result = buildPaginatedResult([1, 2, 3], 45, 2, 20);
    expect(result.meta.totalPages).toBe(3);
    expect(result.meta.hasNextPage).toBe(true);
    expect(result.meta.hasPreviousPage).toBe(true);
  });
});
