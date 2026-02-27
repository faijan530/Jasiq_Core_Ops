function buildGroupSelect(groupBy) {
  const g = String(groupBy || '').toUpperCase();

  if (g === 'DIVISION') {
    return {
      keySelect: 'division_id, division_name',
      keyGroup: 'division_id, division_name',
      orderBy: 'division_name ASC'
    };
  }

  if (g === 'CATEGORY') {
    return {
      keySelect: 'category_id, category_name',
      keyGroup: 'category_id, category_name',
      orderBy: 'category_name ASC'
    };
  }

  return {
    keySelect: 'month',
    keyGroup: 'month',
    orderBy: 'month ASC'
  };
}

function monthStartIso(value) {
  const raw = String(value ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  return start.toISOString().slice(0, 10);
}

function sameMonth(from, to) {
  const a = monthStartIso(from);
  const b = monthStartIso(to);
  if (!a || !b) return null;
  return a === b ? a : null;
}

function toNum(n) {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function applyDirection(base, direction, amount) {
  const dir = String(direction || '').toUpperCase();
  const amt = toNum(amount);
  if (dir === 'DECREASE') return base - amt;
  return base + amt;
}

function normalizeDivisionMap(json) {
  if (!json) return {};
  if (typeof json === 'object') return json;
  try {
    return JSON.parse(String(json));
  } catch {
    return {};
  }
}

async function isMonthClosed(pool, { month }) {
  const res = await pool.query(
    `SELECT status
     FROM month_close
     WHERE scope = 'COMPANY' AND month::date = $1::date
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [month]
  );
  const status = String(res.rows[0]?.status || 'OPEN').toUpperCase();
  return status === 'CLOSED';
}

async function queryPnlFromSnapshot(pool, { month, divisionId, groupBy, includePayroll }) {
  const snapRes = await pool.query(
    `SELECT *
     FROM month_snapshot
     WHERE month::date = $1::date
       AND scope = 'COMPANY'
       AND snapshot_version = 1
     LIMIT 1`,
    [month]
  );

  const snapshot = snapRes.rows[0] || null;
  if (!snapshot) return [];

  const g = String(groupBy || '').toUpperCase();

  const adjustmentsRes = await pool.query(
    `SELECT scope, division_id, target_type, direction, amount
     FROM adjustment
     WHERE target_month::date = $1::date
     ORDER BY created_at ASC, id ASC`,
    [month]
  );
  const adjustments = adjustmentsRes.rows || [];

  if (g === 'DIVISION') {
    const divMap = normalizeDivisionMap(snapshot.division_breakdown);
    const payrollMap = includePayroll ? normalizeDivisionMap(snapshot.payroll_breakdown) : {};

    const divisionKeySet = new Set();
    for (const k of Object.keys(divMap || {})) divisionKeySet.add(String(k));
    for (const k of Object.keys(payrollMap || {})) divisionKeySet.add(String(k));
    for (const adj of adjustments) {
      const scope = String(adj.scope || '').toUpperCase();
      if (scope !== 'DIVISION') continue;
      if (!adj.division_id) continue;
      divisionKeySet.add(String(adj.division_id));
    }

    divisionKeySet.delete('undefined');
    divisionKeySet.delete('');

    const divisionKeys = Array.from(divisionKeySet);
    const divisionIds = divisionKeys.filter((k) => k && k !== 'null');

    const namesRes = divisionIds.length
      ? await pool.query('SELECT id, name FROM division WHERE id = ANY($1::uuid[])', [divisionIds])
      : { rows: [] };
    const nameById = new Map((namesRes.rows || []).map((r) => [String(r.id), r.name]));

    const rows = [];

    for (const divisionKey of divisionKeys) {
      const curDivisionId = divisionKey === 'null' ? null : String(divisionKey);
      if (divisionId && String(divisionId) !== String(curDivisionId)) continue;

      const base = divMap[divisionKey] || divMap[String(curDivisionId)] || {};
      let revenue = toNum(base.income);
      let expense = toNum(base.expense);
      let payroll = includePayroll ? toNum(payrollMap[divisionKey] ?? payrollMap[String(curDivisionId)]) : 0;

      for (const adj of adjustments) {
        const scope = String(adj.scope || '').toUpperCase();
        const adjDiv = adj.division_id ? String(adj.division_id) : null;
        if (scope === 'DIVISION') {
          if (!curDivisionId) continue;
          if (String(adjDiv) !== String(curDivisionId)) continue;
        }

        const t = String(adj.target_type || '').toUpperCase();
        if (t === 'INCOME') revenue = applyDirection(revenue, adj.direction, adj.amount);
        else if (t === 'PAYROLL') payroll = applyDirection(payroll, adj.direction, adj.amount);
        else expense = applyDirection(expense, adj.direction, adj.amount);
      }

      rows.push({
        month,
        division_id: curDivisionId,
        division_name: curDivisionId ? nameById.get(String(curDivisionId)) || null : null,
        revenue,
        expense,
        payroll,
        profit: revenue - expense - payroll
      });
    }

    rows.sort((a, b) => String(a.division_name || '').localeCompare(String(b.division_name || '')));
    return rows;
  }

  // Consolidated / month view
  let revenue = toNum(snapshot.total_income);
  let expense = toNum(snapshot.total_expense);
  let payroll = includePayroll ? toNum(snapshot.total_payroll) : 0;

  for (const adj of adjustments) {
    const scope = String(adj.scope || '').toUpperCase();
    if (scope === 'DIVISION') continue;
    const t = String(adj.target_type || '').toUpperCase();
    if (t === 'INCOME') revenue = applyDirection(revenue, adj.direction, adj.amount);
    else if (t === 'PAYROLL') payroll = applyDirection(payroll, adj.direction, adj.amount);
    else expense = applyDirection(expense, adj.direction, adj.amount);
  }

  return [
    {
      month,
      revenue,
      expense,
      payroll,
      profit: revenue - expense - payroll
    }
  ];
}

export async function queryPnl(pool, { from, to, divisionId, categoryId, groupBy, includePayroll }) {
  const singleMonth = sameMonth(from, to);
  if (singleMonth) {
    const closed = await isMonthClosed(pool, { month: singleMonth });
    if (closed) {
      return await queryPnlFromSnapshot(pool, {
        month: singleMonth,
        divisionId,
        groupBy,
        includePayroll
      });
    }
  }

  const grp = buildGroupSelect(groupBy);

  // Revenue
  const revWhere = [`i.income_date BETWEEN $1::date AND $2::date`, "i.status IN ('APPROVED','PARTIALLY_PAID','PAID','CLOSED')"]; 
  const revParams = [from, to];
  let idx = 3;
  if (divisionId) {
    revWhere.push(`i.division_id = $${idx++}::uuid`);
    revParams.push(divisionId);
  }
  if (categoryId) {
    revWhere.push(`i.category_id = $${idx++}::uuid`);
    revParams.push(categoryId);
  }

  const revKey = String(groupBy || '').toUpperCase() === 'DIVISION'
    ? `i.division_id AS division_id, d.name AS division_name`
    : String(groupBy || '').toUpperCase() === 'CATEGORY'
      ? `i.category_id AS category_id, ic.name AS category_name`
      : `date_trunc('month', i.income_date)::date AS month`;

  const revGroup = String(groupBy || '').toUpperCase() === 'DIVISION'
    ? 'i.division_id, d.name'
    : String(groupBy || '').toUpperCase() === 'CATEGORY'
      ? 'i.category_id, ic.name'
      : "date_trunc('month', i.income_date)::date";

  const revenueSql = `
    SELECT
      ${revKey},
      COALESCE(SUM(i.amount), 0) AS revenue
    FROM income i
    LEFT JOIN division d ON d.id = i.division_id
    LEFT JOIN income_category ic ON ic.id = i.category_id
    WHERE ${revWhere.join(' AND ')}
    GROUP BY ${revGroup}
  `;

  // Expense
  const expWhere = [`e.expense_date BETWEEN $1::date AND $2::date`, "e.status IN ('APPROVED','PAID','CLOSED')"]; 
  const expParams = [from, to];
  let eidx = 3;
  if (divisionId) {
    expWhere.push(`e.division_id = $${eidx++}::uuid`);
    expParams.push(divisionId);
  }
  if (categoryId) {
    expWhere.push(`e.category_id = $${eidx++}::uuid`);
    expParams.push(categoryId);
  }

  const expKey = String(groupBy || '').toUpperCase() === 'DIVISION'
    ? `e.division_id AS division_id, d.name AS division_name`
    : String(groupBy || '').toUpperCase() === 'CATEGORY'
      ? `e.category_id AS category_id, ec.name AS category_name`
      : `date_trunc('month', e.expense_date)::date AS month`;

  const expGroup = String(groupBy || '').toUpperCase() === 'DIVISION'
    ? 'e.division_id, d.name'
    : String(groupBy || '').toUpperCase() === 'CATEGORY'
      ? 'e.category_id, ec.name'
      : "date_trunc('month', e.expense_date)::date";

  const expenseSql = `
    SELECT
      ${expKey},
      COALESCE(SUM(e.amount), 0) AS expense
    FROM expense e
    LEFT JOIN division d ON d.id = e.division_id
    LEFT JOIN expense_category ec ON ec.id = e.category_id
    WHERE ${expWhere.join(' AND ')}
    GROUP BY ${expGroup}
  `;

  const [revRes, expRes] = await Promise.all([
    pool.query(revenueSql, revParams),
    pool.query(expenseSql, expParams)
  ]);

  let payrollRows = [];
  if (includePayroll) {
    // Payroll is month-based; use payroll_item amounts for grouping.
    const payFrom = from.slice(0, 7);
    const payTo = to.slice(0, 7);

    const payKey = String(groupBy || '').toUpperCase() === 'DIVISION'
      ? `pi.division_id AS division_id, d.name AS division_name`
      : `date_trunc('month', pr.month)::date AS month`;

    const payGroup = String(groupBy || '').toUpperCase() === 'DIVISION'
      ? 'pi.division_id, d.name'
      : "date_trunc('month', pr.month)::date";

    const payWhere = [`to_char(pr.month::date, 'YYYY-MM') BETWEEN $1 AND $2`, "pr.status IN ('LOCKED','PAID','CLOSED')"]; 
    const payParams = [payFrom, payTo];
    let pidx = 3;

    if (divisionId && String(groupBy || '').toUpperCase() === 'DIVISION') {
      payWhere.push(`pi.division_id = $${pidx++}::uuid`);
      payParams.push(divisionId);
    }

    const payrollSql = `
      SELECT
        ${payKey},
        COALESCE(SUM(
          CASE
            WHEN pi.item_type = 'DEDUCTION' THEN -pi.amount
            ELSE pi.amount
          END
        ), 0) AS payroll
      FROM payroll_run pr
      LEFT JOIN payroll_item pi ON pi.payroll_run_id = pr.id
      LEFT JOIN division d ON d.id = pi.division_id
      WHERE ${payWhere.join(' AND ')}
      GROUP BY ${payGroup}
    `;

    const payRes = await pool.query(payrollSql, payParams);
    payrollRows = payRes.rows || [];
  }

  const map = new Map();

  function keyOf(r) {
    if (r.month) return `M:${r.month}`;
    if (r.division_id) return `D:${r.division_id}`;
    if (r.category_id) return `C:${r.category_id}`;
    return 'U:unknown';
  }

  function ensure(r) {
    const k = keyOf(r);
    const cur = map.get(k) || {
      month: r.month || null,
      divisionId: r.division_id || null,
      divisionName: r.division_name || null,
      categoryId: r.category_id || null,
      categoryName: r.category_name || null,
      revenue: 0,
      expense: 0,
      payroll: 0
    };
    map.set(k, cur);
    return cur;
  }

  for (const r of revRes.rows || []) {
    const cur = ensure(r);
    cur.revenue = Number(r.revenue || 0);
  }

  for (const r of expRes.rows || []) {
    const cur = ensure(r);
    cur.expense = Number(r.expense || 0);
  }

  for (const r of payrollRows || []) {
    const cur = ensure(r);
    cur.payroll = Number(r.payroll || 0);
  }

  const items = Array.from(map.values());
  items.sort((a, b) => {
    if (grp.orderBy.includes('month')) return String(a.month).localeCompare(String(b.month));
    if (grp.orderBy.includes('division')) return String(a.divisionName || '').localeCompare(String(b.divisionName || ''));
    return String(a.categoryName || '').localeCompare(String(b.categoryName || ''));
  });

  return items.map((it) => ({
    ...it,
    profit: Number(it.revenue) - Number(it.expense) - Number(it.payroll)
  }));
}
