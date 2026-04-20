const fs = require('fs');
const os = require('os');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

function pickWritableDir() {
  const candidates = [
    process.env.APPDATA ? path.join(process.env.APPDATA, 'fatlind-app-data') : null,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'fatlind-app-data') : null,
    path.join(os.tmpdir(), 'fatlind-app-data'),
  ].filter(Boolean);

  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch (err) {
      // provo direktorin tjeter
    }
  }

  throw new Error('Nuk u gjet asnje folder i shkruajshem per databazen SQLite.');
}

const dataDir = pickWritableDir();
const dbPath = path.join(dataDir, 'hvac.db');
const db = new sqlite3.Database(dbPath);

const CREATE_PROJECTS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area INTEGER NOT NULL,
  rooms INTEGER NOT NULL,
  data TEXT NOT NULL,
  drawing_data TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

db.serialize(() => {
  db.run(CREATE_PROJECTS_TABLE_SQL);

  db.run('ALTER TABLE projects ADD COLUMN drawing_data TEXT', (err) => {
    if (err && !String(err.message).includes('duplicate column name')) {
      console.error('Gabim ne migrim:', err.message);
    }
  });
});

module.exports = {
  db,
  dbPath,
  CREATE_PROJECTS_TABLE_SQL,
};
