// src/utils/pagination.ts
import { PaginationParams, PaginatedResponse } from '../types';

export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page  = Math.max(1, parseInt(String(query.page  ?? '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10)));
  return { page, limit };
}

export function buildPaginatedResponse<T>(
  data:    T[],
  total:   number,
  params:  PaginationParams
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / params.limit);
  return {
    data,
    pagination: {
      page:       params.page,
      limit:      params.limit,
      total,
      totalPages,
      hasNext:    params.page < totalPages,
      hasPrev:    params.page > 1,
    },
  };
}
