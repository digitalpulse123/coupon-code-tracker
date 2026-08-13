// Shape of one in-store entry row as it travels from the client to the server
// action. All values are strings from the form; the action parses them.
export type InstoreRowInput = {
  redeemedOn: string;
  storeId: string;
  transactionTotal: string;
  discountAmount: string;
  receiptRef: string;
  itemsText: string;
};
