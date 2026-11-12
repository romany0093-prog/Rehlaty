// Builds supabase/seed.json from the same seedDB() the offline demo uses.
// Rows are already in database column format, so the SQL import is a plain
// jsonb_populate_recordset per table. Passwords are NOT in this file except the
// public demo password; the admin password is set separately.
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');
const ctx = { console, Intl, Date, Math, JSON, encodeURIComponent, localStorage: { getItem: () => null, setItem() {} }, document: { documentElement: {} } };
vm.createContext(ctx);
const src = ['2-base.js', '3-seed.js'].map((f) => fs.readFileSync(__dirname + '/../src/' + f, 'utf8')).join('\n') + '\n;globalThis.__db = seedDB();';
vm.runInContext(src, ctx);
const d = ctx.__db;

const USERNAMES = { u_admin: 'admin', u_c1: 'nilestar', u_c2: 'bahr', u_c3: 'siwa', u_c4: 'ofoq', u_c5: 'marsa', u_c6: 'dream', u_k0: 'mariam', u_k1: 'ahmed', u_k2: 'nour', u_k3: 'karim', u_k4: 'salma', u_k5: 'youssef', u_k6: 'hana', u_k7: 'omar', u_k8: 'laila', u_k9: 'mostafa', u_k10: 'rana', u_k11: 'mahmoud', u_k12: 'farah', u_k13: 'khaled' };
const UUID = {}; d.users.forEach((u) => { UUID[u.id] = crypto.randomUUID(); });
const pick = (o, keys) => { const r = {}; Object.keys(o).forEach((k) => { if (!keys.includes(k)) r[k] = o[k]; }); return r; };
const bk = Object.fromEntries(d.bookings.map((b) => [b.id, b]));

const out = {};
out.auth = d.users.map((u) => ({ id: UUID[u.id], email: u.role === 'admin' ? 'admin@rehlati.eg' : USERNAMES[u.id] + '@demo.eg', admin: u.role === 'admin' }));
out.profiles = d.users.map((u) => ({ id: UUID[u.id], username: USERNAMES[u.id], email: u.role === 'admin' ? 'admin@rehlati.eg' : USERNAMES[u.id] + '@demo.eg', role: u.role, name: u.name, phone: u.phone, city: u.city || null, status: u.status, company_id: u.companyId || null, favorites: u.favorites || [], created_at: u.createdAt, data: {} }));
out.companies = d.companies.map((c) => ({ id: c.id, status: c.status, commission: c.commission, owner: UUID[(d.users.find((u) => u.companyId === c.id) || {}).id] || null, created_at: c.createdAt, data: pick(c, ['id', 'status', 'commission', 'createdAt']) }));
out.destinations = d.destinations.map((x) => ({ id: x.id, data: pick(x, ['id']) }));
out.categories = d.categories.map((x) => ({ id: x.id, data: pick(x, ['id']) }));
out.trips = d.trips.map((t) => ({ id: t.id, company_id: t.companyId, status: t.status, created_at: t.createdAt, data: pick(t, ['id', 'companyId', 'status', 'createdAt']) }));
const tripCo = Object.fromEntries(d.trips.map((t) => [t.id, t.companyId]));
out.departures = d.departures.map((x) => ({ id: x.id, trip_id: x.tripId, company_id: tripCo[x.tripId], start_date: x.start, end_date: x.end, price: x.price, seats: x.seats, status: x.status, data: {} }));
let seq = 1000;
out.bookings = d.bookings.map((b) => ({ id: b.id, ref: b.ref.replace(/-\d+$/, '-' + (seq++)), customer_id: UUID[b.customerId], company_id: b.companyId, trip_id: b.tripId, departure_id: b.departureId, count: b.count, status: b.status, payment_status: b.paymentStatus, total: b.total, commission: b.commission, commission_rate: b.commissionRate, refunded: b.refunded || (b.status === 'refunded' ? b.total : 0), hold_until: b.holdUntil || null, created_at: b.createdAt, paid_at: b.paymentStatus === 'pending' ? null : b.createdAt, data: { travelers: b.travelers, unitPrice: b.unitPrice, subtotal: b.subtotal || b.unitPrice * b.count, discount: b.discount || 0, promo: b.promo || '' } }));
// refunded seed bookings: commission on retained 0
out.bookings.forEach((b) => { if (b.status === 'refunded') b.commission = 0; });
out.payments = d.payments.map((p) => ({ id: p.id, booking_id: p.bookingId, customer_id: UUID[bk[p.bookingId].customerId], company_id: bk[p.bookingId].companyId, method: p.method, amount: p.amount, status: p.status, idem_key: p.idemKey, txn: p.txn, created_at: p.createdAt, data: {} }));
// add refund payment rows for already-refunded seed bookings
d.refunds.filter((r) => r.status === 'approved').forEach((r) => { const b = bk[r.bookingId]; out.payments.push({ id: 'p_rf_' + r.id, booking_id: b.id, customer_id: UUID[b.customerId], company_id: b.companyId, method: 'card', amount: -r.amount, status: 'refund', idem_key: 'refund_' + r.id, txn: 'RF' + (2000000 + out.payments.length), created_at: r.processedAt || r.createdAt, data: {} }); });
out.refunds = d.refunds.map((r) => ({ id: r.id, booking_id: r.bookingId, customer_id: UUID[bk[r.bookingId].customerId], company_id: bk[r.bookingId].companyId, amount: r.amount, pct: r.pct || null, status: r.status, reason: r.reason, created_at: r.createdAt, processed_at: r.processedAt || null, data: {} }));
const uname = Object.fromEntries(d.users.map((u) => [u.id, u.name]));
out.reviews = d.reviews.map((r) => ({ id: r.id, booking_id: r.bookingId, trip_id: r.tripId, company_id: r.companyId, customer_id: UUID[r.customerId], customer_name: uname[r.customerId], ratings: r.ratings, text: r.text, reply: r.reply, created_at: r.createdAt, data: {} }));
const toUser = (t) => (t === 'admin' ? 'admin' : /^u_c\d/.test(t) ? 'company:' + d.users.find((u) => u.id === t).companyId : UUID[t]);
out.notifications = d.notifications.map((n) => ({ id: n.id, to_user: toUser(n.to), title: n.title, body: n.body, link: n.link, read: n.read, created_at: n.createdAt, data: {} }));
out.settlements = d.settlements.map((s) => ({ id: s.id, company_id: s.companyId, amount: s.amount, method: s.method, note: s.note, created_at: s.createdAt, data: {} }));
out.disputes = d.disputes.map((x) => ({ id: x.id, booking_id: x.bookingId, company_id: bk[x.bookingId].companyId, customer_id: UUID[bk[x.bookingId].customerId], subject: x.subject, status: x.status, resolution: x.resolution || null, created_at: x.createdAt, data: {} }));
out.activity = d.activity.map((a, i) => ({ id: 'a' + i, at: a.at, text: a.text, data: {} }));
d.settings.showDemo = true;
out.settings = [{ id: 'main', data: d.settings }];
fs.writeFileSync(__dirname + '/seed.json', JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])), fs.statSync(__dirname + '/seed.json').size);
