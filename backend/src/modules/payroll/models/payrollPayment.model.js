export const PAYROLL_PAYMENT_METHOD = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  UPI: 'UPI',
  CASH: 'CASH',
  OTHER: 'OTHER'
};

export class PayrollPayment {
  constructor(row) {
    this.row = row;
  }

  get id() {
    return this.row?.id;
  }
}
