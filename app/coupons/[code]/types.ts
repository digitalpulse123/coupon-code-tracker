// Shape of one in-store entry row as it travels from the client to the server
// action. Scalar values are strings from the form; products are picked from the
// Metorik product search and stored as structured line items.
export type InstoreProductInput = {
  name: string;
  sku: string;
  quantity: number;
};

export type InstoreRowInput = {
  redeemedOn: string;
  storeId: string;
  transactionTotal: string;
  discountAmount: string;
  receiptRef: string;
  products: InstoreProductInput[];
};
