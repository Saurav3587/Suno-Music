import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function showUsers() {
  const DB_HOST = process.env.DB_HOST;
  const DB_USER = process.env.DB_USER;
  const DB_PASSWORD = process.env.DB_PASSWORD;
  const DB_NAME = process.env.DB_NAME || 'suno_music';
  const DB_PORT = parseInt(process.env.DB_PORT || '4000', 10);

  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    database: DB_NAME,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });

  const [users] = await conn.query('SELECT id, user_id, name, phone, bio, created_at FROM users ORDER BY created_at DESC');
  const [playlists] = await conn.query('SELECT count(*) as count FROM playlists');
  const [likes] = await conn.query('SELECT count(*) as count FROM liked_songs');

  console.log('\n📊 === SUNO MUSIC: REGISTERED USERS === 📊');
  console.table(users.map(u => ({
    'ID': u.id,
    'User ID': u.user_id,
    'Name': u.name,
    'Phone': u.phone,
    'Joined': new Date(u.created_at).toLocaleDateString()
  })));

  console.log(`\n📈 Stats Summary:`);
  console.log(`• Total Users:     ${users.length}`);
  console.log(`• Total Playlists: ${playlists[0].count}`);
  console.log(`• Total Likes:     ${likes[0].count}\n`);

  await conn.end();
}

showUsers().catch(console.error);
