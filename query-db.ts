import Database from 'better-sqlite3';
const db = new Database('./data/sqlite.db');
const results = db.prepare("SELECT id, clientName, clientEmail, clientId, version, versionName, isActiveVersion FROM client_protocols WHERE clientEmail LIKE '%kevinr%' OR clientName LIKE '%Kevin Reid%' ORDER BY id").all();
console.log(JSON.stringify(results, null, 2));
db.close();
