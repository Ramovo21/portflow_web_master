export function documentQueryKeys(
  documentType: string,
  documentId: string,
): (readonly unknown[])[] {
  switch (documentType) {
    case "CONTRACT":
      return [["contract", documentId], ["contracts"]];
    case "ADDENDUM":
      return [["addendum", documentId]];
    case "PRICE_LIST":
      return [["price-list", documentId], ["price-lists"]];
    default:
      return [];
  }
}
