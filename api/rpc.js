// Server side (Vercel Serverless). Users and students are managed here with the Firebase Admin SDK.
const admin = require('firebase-admin');
const crypto = require('crypto');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const hash = (p, s) => crypto.pbkdf2Sync(p, s, 60000, 32, 'sha256').toString('hex');
const mk = p => { const salt = crypto.randomBytes(12).toString('hex'); return { salt, hash: hash(p, salt) }; };
const err = (status, message) => Object.assign(new Error(message), { status });
const uid = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
const str = s => String(s ?? '').trim();
async function who(req) {
  try { return await admin.auth().verifyIdToken((req.headers.authorization || '').replace('Bearer ', '')); }
  catch { throw err(401, 'Please log in again'); }
}
async function A(req) { const t = await who(req); if (t.role !== 'admin') throw err(403, 'Admin access only'); return t; }
const okPw = p => { if (String(p || '').length < 4) throw err(400, 'Password must be at least 4 characters'); return String(p); };
const act = {
  async login(b) {
    const u = uid(b.username);
    let d = await db.doc('users/' + u).get();
    if (!d.exists && u === 'admin') { // admin account is created on first login
      await db.doc('users/admin').set({ role: 'admin', name: 'Admin', blocked: false, classes: [], ...mk(process.env.ADMIN_PASSWORD || 'admin123') });
      d = await db.doc('users/admin').get();
    }
    const x = d.data();
    if (!x || x.hash !== hash(String(b.password || ''), x.salt)) throw err(401, 'Incorrect username or password');
    if (x.blocked) throw err(403, 'Your account is blocked. Please contact the admin');
    return { token: await admin.auth().createCustomToken(u, { role: x.role, name: x.name || u, gr: x.role === 'parent' ? u : '', classes: x.classes || [] }) };
  },
  async changePassword(b, req) {
    const t = await who(req), ref = db.doc('users/' + t.uid), x = (await ref.get()).data();
    if (!x || x.hash !== hash(String(b.oldPassword || ''), x.salt)) throw err(400, 'Current password is incorrect');
    await ref.update(mk(okPw(b.newPassword)));
  },
  async listUsers(b, req) {
    await A(req);
    return { users: (await db.collection('users').get()).docs.map(d => { const { hash, salt, ...x } = d.data(); return { username: d.id, ...x }; }) };
  },
  async createTeacher(b, req) {
    await A(req);
    const u = uid(b.username); if (!u) throw err(400, 'Enter a username');
    if ((await db.doc('users/' + u).get()).exists) throw err(400, 'This username already exists');
    await db.doc('users/' + u).set({ role: 'teacher', name: str(b.name) || u, blocked: false, classes: [].concat(b.classes || []), ...mk(okPw(b.password)) });
  },
  async updateTeacher(b, req) {
    await A(req);
    await db.doc('users/' + uid(b.username)).update({ name: str(b.name), classes: [].concat(b.classes || []) });
  },
  async setPassword(b, req) { await A(req); await db.doc('users/' + uid(b.username)).update(mk(okPw(b.password))); },
  async resetPassword(b, req) { await A(req); await db.doc('users/' + uid(b.username)).update(mk('1234')); },
  async blockUser(b, req) {
    await A(req); const u = uid(b.username); if (u === 'admin') throw err(400, 'Admin cannot be blocked');
    await db.doc('users/' + u).update({ blocked: !!b.blocked });
  },
  async deleteUser(b, req) {
    await A(req); const u = uid(b.username); if (u === 'admin') throw err(400, 'Admin cannot be deleted');
    await db.doc('users/' + u).delete();
  },
  async importStudents(b, req) {
    await A(req);
    const rows = (b.rows || []).map(r => {
      const gr = uid(r.gr), cls = str(r.cls), sec = (str(r.sec) || 'A').toUpperCase();
      return { gr, name: str(r.name), father: str(r.father), cls, sec, key: cls + '|' + sec, roll: str(r.roll), phone: str(r.phone) };
    }).filter(r => r.gr && r.name && r.cls);
    const skipped = (b.rows || []).length - rows.length, def = mk('1234');
    let added = 0, updated = 0;
    for (let i = 0; i < rows.length; i += 150) {
      const part = rows.slice(i, i + 150);
      const ex = await db.getAll(...part.map(r => db.doc('students/' + r.gr)));
      const ux = await db.getAll(...part.map(r => db.doc('users/' + r.gr)));
      const batch = db.batch();
      part.forEach((r, j) => {
        ex[j].exists ? updated++ : added++;
        batch.set(db.doc('students/' + r.gr), r);
        if (!ux[j].exists) batch.set(db.doc('users/' + r.gr), { role: 'parent', name: 'Parent of ' + r.name, blocked: false, classes: [], ...def });
        else if (ux[j].data().role === 'parent') batch.update(db.doc('users/' + r.gr), { name: 'Parent of ' + r.name });
      });
      await batch.commit();
    }
    return { added, updated, skipped };
  },
  async deleteStudent(b, req) {
    await A(req); const g = uid(b.gr);
    await db.doc('students/' + g).delete();
    const u = await db.doc('users/' + g).get(); if (u.exists && u.data().role === 'parent') await u.ref.delete();
    const at = await db.collection('att').where('gr', '==', g).get();
    for (let i = 0; i < at.docs.length; i += 400) { const bt = db.batch(); at.docs.slice(i, i + 400).forEach(d => bt.delete(d.ref)); await bt.commit(); }
  }
};
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!act[b.action]) throw err(400, 'Unknown action');
    res.status(200).json((await act[b.action](b, req)) || { ok: true });
  } catch (x) { res.status(x.status || 500).json({ error: x.message || 'Server error' }); }
};
