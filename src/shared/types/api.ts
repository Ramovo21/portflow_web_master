export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface PersonRef {
  id: string;
  fullName: string | null;
}

export type DocumentType = "CONTRACT" | "ADDENDUM" | "PRICE_LIST" | "PAYMENT_SHEET" | (string & {});
