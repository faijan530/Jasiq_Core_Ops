export class Payslip {
  constructor(row) {
    this.row = row;
  }

  get id() {
    return this.row?.id;
  }
}
