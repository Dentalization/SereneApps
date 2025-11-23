import pg from 'pg';

const pool = new pg.Pool({
  user: process.env.DB_USER || 'serene',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'serene',
  password: process.env.DB_PASSWORD || 'serene',
  port: Number(process.env.DB_PORT || 5432),
});

const findBranchForDentist = (rows) => {
  return rows[0]?.branch_id || rows[0]?.first_branch || null;
};

async function backfill() {
  const client = await pool.connect();
  try {
    console.log('Starting clinic branch backfill for appointments...');

    const appointments = await client.query(
      `SELECT id, dentist_id, clinic_branch_id
       FROM appointments
       WHERE clinic_branch_id IS NULL`
    );

    console.log(`Found ${appointments.rowCount} appointments without clinic_branch_id.`);

    for (const appointment of appointments.rows) {
      const dentistId = appointment.dentist_id;

      const result = await client.query(
        `
        SELECT cb.id AS branch_id
        FROM clinic_branches cb
        JOIN clinic_staff cs ON cs.assigned_branch_id = cb.id
        JOIN dentist_profiles dp ON dp.user_id = cs.user_id
        WHERE dp.id = $1
        LIMIT 1
        `,
        [dentistId]
      );

      const branchId = findBranchForDentist(result.rows);

      if (!branchId) {
        console.warn(`No clinic branch found for appointment ${appointment.id} (dentist ${dentistId})`);
        continue;
      }

      await client.query(
        `UPDATE appointments SET clinic_branch_id = $1 WHERE id = $2`,
        [branchId, appointment.id]
      );
      console.log(`Updated appointment ${appointment.id} with branch ${branchId}`);
    }

    console.log('Backfill completed.');
  } catch (error) {
    console.error('Backfill failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

backfill();
