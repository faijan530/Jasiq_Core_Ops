export const PAYROLL_ITEM_TYPE = {
  BASE_PAY: 'BASE_PAY',
  ALLOWANCE: 'ALLOWANCE',
  BONUS: 'BONUS',
  DEDUCTION: 'DEDUCTION',
  ADJUSTMENT: 'ADJUSTMENT'
};

export class PayrollItem {
  constructor(row) {
    this.row = row;
  }

  get id() {
    return this.row?.id;
  }
}
