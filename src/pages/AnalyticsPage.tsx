import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function AnalyticsPage() {
  // Fake/demo data
  const wipMetrics = {
    total: 48,
    prepress: 6,
    printing: 24,
    finishing: 10,
    onHold: 3,
    avgLeadTimeDays: 4.2,
    onTimeRate: 0.95,
  };

  const printingMachines = [
    { name: 'P5', status: 'standby', avgTime: '1.2 hrs', util: '72%', notes: 'Spare cutter offline' },
    { name: 'Latex', status: 'printing', avgTime: '2.1 hrs', util: '81%', notes: 'Running large run' },
    { name: 'Col', status: 'maintenance', avgTime: '1.8 hrs', util: '60%', notes: 'Head service due' },
    { name: 'Rho', status: 'offline', avgTime: '2.5 hrs', util: '45%', notes: 'Scheduled downtime' },
  ];

  const sales = {
    revenue: 245600,
    orders: 1320,
    avgOrder: 186.06,
    newClients: 16,
    leadingCategory: 'Labels',
    repeatRate: 0.43,
  };

  const salesByCategory = [
    { name: 'Small format', orders: 420, revenue: 48000, avg: 114 },
    { name: 'Reboard', orders: 180, revenue: 36000, avg: 200 },
    { name: 'Fabric', orders: 220, revenue: 55000, avg: 250 },
    { name: 'Vinyl', orders: 300, revenue: 64000, avg: 213 },
  ];

  const topCustomers = [
    { name: 'Chicken', orders: 120, revenue: 15200, last: '2025-08-12' },
    { name: 'Beef', orders: 98, revenue: 12400, last: '2025-09-02' },
    { name: 'PorkCo', orders: 85, revenue: 11000, last: '2025-07-30' },
  ];

  const invoices = [
    { id: 'INV123', client: 'Chicken', amount: 12312, due: '2025-02-14', days: 13, status: 'Overdue' },
    { id: 'INV401', client: 'Beef', amount: 5420, due: '2025-09-01', days: 0, status: 'Paid' },
  ];

  const packing = { totalPacked: 290, avgTimeMin: 12, packagingCost: 420.5 };

  const inventory = { totalValue: 82000, turnover: 4.2, avgDays: 36, outOfStock: 2, expired: 0 };

  const costing = {
    monthCost: 182400,
    revenue: 245600,
    grossMarginPct: 25.7,
    avgCostPerJob: 585,
    topDriver: 'Vinyl',
    mostProfitable: 'Labels',
  };

  const gl = { revenue: 245600, expenses: 192900, net: 52700, variancePct: 4.3 };

  const alerts = [
    { date: '2025-04-14', code: '5200', desc: 'Freelance tech', issue: 'Duplicate entry flagged' },
    { date: '2025-04-15', code: '5999', desc: 'Misc', issue: 'Accounts need mapping' },
  ];

  const performance = { jobsCompleted: 296, avgTurnaroundDays: 3.2, revenue: 245600, margin: '25.7%', onTime: '95%' };

  return (
    <div className="text-left space-y-6">
      {/* Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-5 select-none z-0">
        <span className="text-8xl font-extrabold">REPORTS</span>
      </div>

      <div className="relative z-10">
        <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
        <p className="text-sm text-muted-foreground mb-4">Data analysis used by management or sales to help determine course of the company or scheduling for production purposes (demo only).</p>

        {/* Top KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent>
              <div className="text-sm text-muted-foreground">Total WIP Jobs</div>
              <div className="text-2xl font-semibold">{wipMetrics.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="text-sm text-muted-foreground">Average Lead time</div>
              <div className="text-2xl font-semibold">{wipMetrics.avgLeadTimeDays} days</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="text-sm text-muted-foreground">On-time delivery rate</div>
              <div className="text-2xl font-semibold">{Math.round(wipMetrics.onTimeRate * 100)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="text-sm text-muted-foreground">Jobs on hold</div>
              <div className="text-2xl font-semibold">{wipMetrics.onHold}</div>
            </CardContent>
          </Card>
        </div>

        {/* WIP section as cards */}
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">WIP Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <h3 className="font-semibold">Overview</h3>
                <ul className="mt-2 text-sm">
                  <li>Total WIP: {wipMetrics.total}</li>
                  <li>Jobs in Prepress: {wipMetrics.prepress}</li>
                  <li>Jobs in Printing: {wipMetrics.printing}</li>
                  <li>Jobs in Finishing: {wipMetrics.finishing}</li>
                  <li>Jobs on hold: {wipMetrics.onHold}</li>
                  <li>Average Lead time: {wipMetrics.avgLeadTimeDays} days</li>
                  <li>On-time delivery: {Math.round(wipMetrics.onTimeRate * 100)}%</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="font-semibold">WIP Breakdown per department</h3>
                <div className="mt-2 text-sm space-y-2">
                  <div>
                    <strong>Prepress</strong>: Status: normal (-1 person) — Avg time in stage: 0.8 days — Main delay cause: File correction
                  </div>

                  <div>
                    <strong>Printing</strong>:
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      {printingMachines.map((m) => (
                        <li key={m.name}>{m.name} — Status: {m.status} — Avg: {m.avgTime} — Util: {m.util} — {m.notes}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <strong>Finishing</strong>:
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      <li>Kongsberg c64 — Status: Normal — Avg Cutting time: 35 mins — Util: 58% — Notes: OK</li>
                      <li>Zund — Status: maintenance — Avg Cutting time: 40 mins — Util: 45% — Notes: Blade replacement</li>
                    </ul>
                  </div>

                  <div>
                    <strong>Sewing</strong>: Status: Normal — Avg Sewing time: 1.1 hrs — Utilisation: 62%
                  </div>

                  <div>
                    <strong>Reboard assembly</strong>: Status: Normal — Avg assembly time: 0.9 hrs
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="font-semibold">Need attention</h3>
                <div className="mt-2 text-sm">
                  <div>Job ID: J-10234 — Client: Chicken — Stage: Printing — Delay Reason: Waiting on approval — Days in WIP: 6</div>
                  <div className="mt-2">Job ID: J-10111 — Client: Beef — Stage: Finishing — Delay Reason: Machine fault — Days in WIP: 4</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Sales as cards */}
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Sales Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Total sales Revenue</div>
                <div className="text-2xl font-semibold">${sales.revenue.toLocaleString()}</div>
                <div className="text-sm mt-2">Orders: {sales.orders} • Avg order: ${sales.avgOrder.toFixed(2)}</div>
                <div className="text-sm">New clients: {sales.newClients} • Repeat rate: {Math.round(sales.repeatRate * 100)}%</div>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardContent>
                <h3 className="font-semibold">Sales by category</h3>
                <table className="w-full text-sm mt-2 border-collapse">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Orders</th>
                      <th className="pb-2">Revenue</th>
                      <th className="pb-2">Avg value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByCategory.map((c) => (
                      <tr key={c.name} className="border-t">
                        <td className="py-2">{c.name}</td>
                        <td className="py-2">{c.orders}</td>
                        <td className="py-2">${c.revenue.toLocaleString()}</td>
                        <td className="py-2">${c.avg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <h3 className="font-semibold">Top Customers (YTD)</h3>
                <ul className="mt-2 text-sm">
                  {topCustomers.map((t) => (
                    <li key={t.name}>{t.name} — Orders: {t.orders} — Revenue: ${t.revenue} — Last: {t.last}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardContent>
                <h3 className="font-semibold">Monthly sales trend (demo)</h3>
                <div className="mt-2 text-sm text-muted-foreground">[Non-functional chart placeholder]</div>
                <div className="mt-4 h-36 bg-gray-50 rounded flex items-center justify-center text-gray-400">Chart placeholder</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Invoice as cards */}
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Invoice Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Invoice status breakdown</div>
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="text-left"><th>Status</th><th>Count</th><th>Value</th></tr>
                  </thead>
                  <tbody>
                    <tr className="border-t"><td>Paid</td><td>1200</td><td>$1,200,000</td></tr>
                    <tr className="border-t"><td>Overdue</td><td>45</td><td>$54,200</td></tr>
                    <tr className="border-t"><td>Disputed</td><td>3</td><td>$1,200</td></tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardContent>
                <h3 className="font-semibold">Top outstanding invoices</h3>
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="text-left"><th>Inv #</th><th>Client</th><th>Amount</th><th>Due</th><th>Days overdue</th></tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-t"><td>{inv.id}</td><td>{inv.client}</td><td>${inv.amount.toLocaleString()}</td><td>{inv.due}</td><td>{inv.days}</td></tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Packing & Inventory as cards */}
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Packing & Inventory</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">Packing</div>
                <div className="mt-2">Total Jobs Packed: {packing.totalPacked}</div>
                <div>Average packing time: {packing.avgTimeMin} mins</div>
                <div>Packaging Material Cost: ${packing.packagingCost.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardContent>
                <div className="text-sm text-muted-foreground">Inventory</div>
                <div className="mt-2">Total Inventory value: ${inventory.totalValue.toLocaleString()}</div>
                <div>Stock turnover rate: {inventory.turnover}</div>
                <div>Average days in inventory: {inventory.avgDays}</div>
                <div>Out of stock incidents: {inventory.outOfStock}</div>
                <div>Expired incidents: {inventory.expired}</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Costing & GL as cards */}
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Costing & GL</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <div className="text-sm text-muted-foreground">This month</div>
                <div className="mt-2">Total Production Cost: ${costing.monthCost.toLocaleString()}</div>
                <div>Total Revenue: ${costing.revenue.toLocaleString()}</div>
                <div>Gross Margin: {costing.grossMarginPct}%</div>
                <div>Top cost driver: {costing.topDriver}</div>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardContent>
                <h3 className="font-semibold">GL Summary</h3>
                <div className="mt-2">Total Revenue: ${gl.revenue.toLocaleString()} • Total Expenses: ${gl.expenses.toLocaleString()} • Net: ${gl.net.toLocaleString()}</div>
                <div className="mt-3">Budget Variance: {gl.variancePct}%</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Alerts & Performance as cards */}
        <section className="mb-6">
          <h2 className="text-xl font-bold mb-3">Alerts & Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent>
                <h3 className="font-semibold">Alerts (anomaly detection)</h3>
                <ul className="mt-2 text-sm">
                  {alerts.map((a, i) => (
                    <li key={i}>{a.date} — GL {a.code} — {a.desc} — {a.issue}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="col-span-2">
              <CardContent>
                <h3 className="font-semibold">Company performance (monthly)</h3>
                <div className="mt-2 grid grid-cols-3 gap-4">
                  <div className="p-2 bg-gray-50 rounded">Jobs Completed: {performance.jobsCompleted}</div>
                  <div className="p-2 bg-gray-50 rounded">Avg Turnaround: {performance.avgTurnaroundDays} days</div>
                  <div className="p-2 bg-gray-50 rounded">On-time Delivery: {performance.onTime}</div>
                </div>

                <div className="mt-4">
                  <h4 className="font-semibold">Department performance highlights</h4>
                  <div className="mt-2 text-sm">
                    <div>Printing — Avg print time: 1.2 hrs — Status: On track</div>
                    <div>Laminating — Avg time: 23 mins — Status: Good</div>
                    <div>Cutting — Avg time: 1.5 hrs — Status: On track</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

      </div>
    </div>
  );
}
