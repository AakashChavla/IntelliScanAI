export interface PaginationQuery {
  query?: string;
  limit?: number;
  page?: number;
  orderBy?: 'asc' | 'desc';
  orderField?: string;
}

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
