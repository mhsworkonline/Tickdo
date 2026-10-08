// Row Level Security tests for every policy and RPC in supabase/migrations.
// Runs real Postgres (PGlite, WebAssembly) with a stub of Supabase's auth schema; no Docker.
//   npm run test:db
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, '..', 'migrations');
const stub = readFileSync(join(here, 'auth-stub.sql'), 'utf8');
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => readFileSync(join(migrationsDir, f), 'utf8'));

const A = { id: '00000000-0000-0000-0000-00000000000a', phone: '919800000001' }; // patient
const B = { id: '00000000-0000-0000-0000-00000000000b', phone: '919800000002' }; // caregiver
const C = { id: '00000000-0000-0000-0000-00000000000c', phone: '919800000003' }; // stranger

let db;

/** Runs `sql` as a signed-in user (or anon) inside a transaction, like PostgREST does. */
async function as(user, sql, params = []) {
  const claims = user ? JSON.stringify({ sub: user.id, phone: user.phone, role: 'authenticated' }) : '{}';
  const role = user === 'service' ? 'service_role' : user ? 'authenticated' : 'anon';
  await db.exec('begin');
  try {
    await db.query(`select set_config('request.jwt.claims', $1, true)`, [user === 'service' ? '{}' : claims]);
    await db.exec(`set local role ${role}`);
    const res = await db.query(sql, params);
    await db.exec('commit');
    return res.rows;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}
const rejects = (p) => assert.rejects(p);

beforeEach(async () => {
  db = new PGlite();
  await db.exec(stub);
  for (const m of migrations) await db.exec(m);
  for (const u of [A, B, C]) await db.query('insert into auth.users (id, phone) values ($1, $2)', [u.id, u.phone]);
  await as(A, `insert into profiles (id, display_name) values ('${A.id}', 'Asha')`);
  await as(B, `insert into profiles (id, display_name) values ('${B.id}', 'Ravi')`);
});

async function invite(phone = `+${B.phone}`) {
  const [row] = await as(A, `insert into caregiver_links (patient_id, caregiver_phone) values ($1, $2) returning id`, [A.id, phone]);
  return row.id;
}
async function acceptedLink() {
  const link = await invite();
  await as(B, 'select respond_to_invite($1, true)', [link]);
  return link;
}
const dose = (key = 'm1@1', status = 'pending', minutesAgo = 90) =>
  as(A, `insert into shared_doses (patient_id, dose_key, medicine_label, scheduled_at, status)
         values ($1, $2, 'Metformin 500 mg', now() - make_interval(mins => $3), $4)`, [A.id, key, minutesAgo, status]);

describe('anon', () => {
  it('cannot read or write any table', async () => {
    for (const t of ['profiles', 'caregiver_links', 'shared_doses', 'push_tokens']) {
      await rejects(as(null, `select * from ${t}`));
    }
    await rejects(as(null, `insert into profiles (id) values ('${C.id}')`));
  });
});

describe('profiles', () => {
  it('profiles_insert: only for yourself', async () => {
    await rejects(as(C, `insert into profiles (id, display_name) values ('${A.id}', 'x')`));
    await as(C, `insert into profiles (id, display_name) values ('${C.id}', 'Sam')`);
  });

  it('profiles_select: own row; strangers see nothing', async () => {
    assert.deepEqual(await as(A, 'select display_name from profiles'), [{ display_name: 'Asha' }]);
    assert.deepEqual(await as(C, `select * from profiles where id = '${A.id}'`), []);
  });

  it('profiles_select: the invited phone and the accepted caregiver can read the patient name; strangers cannot', async () => {
    assert.deepEqual(await as(B, `select display_name from profiles where id = '${A.id}'`), []);
    const link = await invite();
    assert.deepEqual(await as(B, `select display_name from profiles where id = '${A.id}'`), [{ display_name: 'Asha' }]);
    assert.deepEqual(await as(C, `select display_name from profiles where id = '${A.id}'`), []);
    await as(B, 'select respond_to_invite($1, true)', [link]);
    assert.deepEqual(await as(B, `select display_name from profiles where id = '${A.id}'`), [{ display_name: 'Asha' }]);
  });

  it('profiles_update: only your own', async () => {
    await as(C, `update profiles set display_name = 'hacked' where id = '${A.id}'`);
    assert.deepEqual(await as(A, 'select display_name from profiles'), [{ display_name: 'Asha' }]);
    await as(A, `update profiles set display_name = 'Asha D' where id = '${A.id}'`);
    assert.deepEqual(await as(A, 'select display_name from profiles'), [{ display_name: 'Asha D' }]);
  });
});

describe('caregiver_links', () => {
  it('links_insert: a patient can invite for themselves only, not on behalf of others', async () => {
    await invite();
    await rejects(as(C, `insert into caregiver_links (patient_id, caregiver_phone) values ('${A.id}', '+${C.phone}')`));
  });

  it('links_insert: cannot pre-accept, attach a caregiver id, or invite yourself', async () => {
    await rejects(as(A, `insert into caregiver_links (patient_id, caregiver_phone, status) values ('${A.id}', '+${B.phone}', 'accepted')`));
    await rejects(as(A, `insert into caregiver_links (patient_id, caregiver_phone, caregiver_id) values ('${A.id}', '+${B.phone}', '${B.id}')`));
    await rejects(as(A, `insert into caregiver_links (patient_id, caregiver_phone) values ('${A.id}', '+${A.phone}')`));
  });

  it('only one active caregiver per patient', async () => {
    await invite();
    await rejects(invite(`+${C.phone}`));
  });

  it('rejects malformed phone numbers', async () => {
    await rejects(invite('9800000002'));
  });

  it('links_select: patient and the invited phone see the invite; strangers do not', async () => {
    await invite();
    assert.equal((await as(A, 'select * from caregiver_links')).length, 1);
    assert.equal((await as(B, 'select * from caregiver_links')).length, 1);
    assert.equal((await as(C, 'select * from caregiver_links')).length, 0);
  });

  it('the invited person cannot accept by updating the row directly', async () => {
    const link = await invite();
    await as(B, `update caregiver_links set status = 'accepted', caregiver_id = '${B.id}' where id = '${link}'`);
    const [row] = await as(A, 'select status, caregiver_id from caregiver_links');
    assert.deepEqual(row, { status: 'pending', caregiver_id: null });
  });

  it('respond_to_invite: works only for the phone it was sent to', async () => {
    const link = await invite();
    await rejects(as(C, 'select respond_to_invite($1, true)', [link]));
    await as(B, 'select respond_to_invite($1, true)', [link]);
    const [row] = await as(A, 'select status, caregiver_id from caregiver_links');
    assert.deepEqual(row, { status: 'accepted', caregiver_id: B.id });
    await rejects(as(B, 'select respond_to_invite($1, true)', [link])); // no longer pending
  });

  it('respond_to_invite: declining revokes the invite', async () => {
    const link = await invite();
    await as(B, 'select respond_to_invite($1, false)', [link]);
    const [row] = await as(A, 'select status, caregiver_id from caregiver_links');
    assert.deepEqual(row, { status: 'revoked', caregiver_id: null });
  });

  it('links_revoke: the patient can revoke but cannot set any other status', async () => {
    const link = await acceptedLink();
    await rejects(as(A, `update caregiver_links set status = 'pending' where id = '${link}'`));
    await as(A, `update caregiver_links set status = 'revoked' where id = '${link}'`);
    assert.equal((await as(A, 'select status from caregiver_links'))[0].status, 'revoked');
  });

  it('leave_caregiving: the caregiver can step away; others cannot end the link', async () => {
    const link = await acceptedLink();
    await as(C, 'select leave_caregiving($1)', [link]);
    assert.equal((await as(A, 'select status from caregiver_links'))[0].status, 'accepted');
    await as(B, 'select leave_caregiving($1)', [link]);
    assert.equal((await as(A, 'select status from caregiver_links'))[0].status, 'revoked');
  });
});

describe('shared_doses', () => {
  it('doses_insert / doses_update / doses_delete: patient only', async () => {
    await dose();
    await rejects(as(C, `insert into shared_doses (patient_id, dose_key, medicine_label, scheduled_at, status) values ('${A.id}', 'x', 'y', now(), 'taken')`));
    await as(A, `update shared_doses set status = 'taken' where dose_key = 'm1@1'`);
    await as(C, `delete from shared_doses where patient_id = '${A.id}'`);
    assert.equal((await as(A, 'select status from shared_doses'))[0].status, 'taken');
    await as(A, `delete from shared_doses where dose_key = 'm1@1'`);
    assert.equal((await as(A, 'select * from shared_doses')).length, 0);
  });

  it('doses_select: caregiver reads only after accepting, and loses access when revoked', async () => {
    await dose();
    const link = await invite();
    assert.equal((await as(B, 'select * from shared_doses')).length, 0);
    await as(B, 'select respond_to_invite($1, true)', [link]);
    assert.equal((await as(B, 'select * from shared_doses')).length, 1);
    await as(A, `update caregiver_links set status = 'revoked' where id = '${link}'`);
    assert.equal((await as(B, 'select * from shared_doses')).length, 0);
  });

  it('caregivers cannot change the patient log', async () => {
    await dose();
    await acceptedLink();
    await rejects(as(B, `insert into shared_doses (patient_id, dose_key, medicine_label, scheduled_at, status) values ('${A.id}', 'x', 'y', now(), 'taken')`));
    await as(B, `update shared_doses set status = 'taken'`);
    assert.equal((await as(A, 'select status from shared_doses'))[0].status, 'pending');
  });

  it('strangers never see shared doses', async () => {
    await dose();
    await acceptedLink();
    assert.equal((await as(C, 'select * from shared_doses')).length, 0);
  });
});

describe('push_tokens', () => {
  it('tokens_all: own tokens only', async () => {
    await as(B, `insert into push_tokens (user_id, token) values ('${B.id}', 'ExponentPushToken[b]')`);
    await rejects(as(C, `insert into push_tokens (user_id, token) values ('${B.id}', 'ExponentPushToken[c]')`));
    assert.equal((await as(C, 'select * from push_tokens')).length, 0);
    assert.equal((await as(B, 'select * from push_tokens')).length, 1);
  });
});

describe('overdue alerts (server job)', () => {
  it('overdue_doses_to_alert: not callable by users', async () => {
    await rejects(as(A, 'select * from overdue_doses_to_alert()'));
    await rejects(as(B, 'select * from overdue_doses_to_alert()'));
  });

  it('returns doses >60 min late that were not taken or skipped, with an accepted caregiver', async () => {
    await acceptedLink();
    await as(B, `insert into push_tokens (user_id, token) values ('${B.id}', 'ExponentPushToken[b]')`);
    await dose('late', 'pending', 61);
    await dose('recent', 'pending', 59);
    await dose('taken', 'taken', 120);
    await dose('skipped', 'skipped', 120);
    await dose('marked-missed', 'missed', 75);
    const rows = await as('service', 'select dose_key, patient_name, tokens from overdue_doses_to_alert() order by dose_key');
    assert.deepEqual(rows, [
      { dose_key: 'late', patient_name: 'Asha', tokens: ['ExponentPushToken[b]'] },
      { dose_key: 'marked-missed', patient_name: 'Asha', tokens: ['ExponentPushToken[b]'] },
    ]);
  });

  it('no alerts without an accepted caregiver', async () => {
    await invite();
    await dose('late', 'pending', 90);
    assert.deepEqual(await as('service', 'select * from overdue_doses_to_alert()'), []);
  });
});

describe('delete_my_account', () => {
  it('deletes all of the caller’s server data, verifies zero remain, and leaves others intact', async () => {
    await dose();
    await acceptedLink();
    await as(A, `insert into push_tokens (user_id, token) values ('${A.id}', 'ExponentPushToken[a]')`);
    const [{ delete_my_account: remaining }] = await as(A, 'select delete_my_account()');
    assert.equal(remaining, 0);
    for (const [t, col] of [['shared_doses', 'patient_id'], ['push_tokens', 'user_id'], ['profiles', 'id']]) {
      assert.equal((await db.query(`select count(*)::int as n from ${t} where ${col} = $1`, [A.id])).rows[0].n, 0);
    }
    assert.equal((await db.query('select count(*)::int as n from auth.users where id = $1', [A.id])).rows[0].n, 0);
    assert.equal((await db.query('select count(*)::int as n from caregiver_links')).rows[0].n, 0);
    assert.deepEqual(await as(B, 'select display_name from profiles'), [{ display_name: 'Ravi' }]);
  });

  it('requires a signed-in user', async () => {
    await rejects(as(null, 'select delete_my_account()'));
  });
});
