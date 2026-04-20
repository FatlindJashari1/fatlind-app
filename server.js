const path = require('path');
const express = require('express');
const cors = require('cors');
const { db, dbPath } = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

function gjeneroHVAC(area, rooms) {
  const roomLabels = ['Sallon', 'Kuzhine', 'Banjo'];
  const dhomat = [];

  for (let i = 1; i <= rooms; i += 1) {
    if (i === 1) {
      dhomat.push({ emri: roomLabels[0] });
    } else if (i === rooms) {
      dhomat.push({ emri: roomLabels[2] });
    } else if (i === 2) {
      dhomat.push({ emri: roomLabels[1] });
    } else {
      dhomat.push({ emri: `Dhoma gjumi ${i - 2}` });
    }
  }

  const areaPerRoom = Math.max(8, Math.round(area / rooms));
  const roomsData = dhomat.map((dhoma, index) => {
    const roomArea = index === dhomat.length - 1
      ? Math.max(6, area - areaPerRoom * (dhomat.length - 1))
      : areaPerRoom;

    return {
      emri: dhoma.emri,
      siperfaqe_m2: roomArea,
      radiatore: Math.max(1, Math.ceil(roomArea / 18)),
    };
  });

  let boilerKw = 24;
  if (area > 80 && area <= 120) boilerKw = 30;
  if (area > 120 && area <= 160) boilerKw = 36;
  if (area > 160) boilerKw = 42;

  return {
    dhomat: roomsData,
    radiatore_total: roomsData.reduce((sum, d) => sum + d.radiatore, 0),
    boiler: `${boilerKw}kW`,
    tuba: 'Sistem me dy tuba (supply/return loop): linja e furnizimit shkon te cdo radiator dhe kthehet ne boiler me linjen e kthimit.',
  };
}

app.post('/projects', (req, res) => {
  const { name, area, rooms } = req.body;

  if (!name || !area || !rooms) {
    return res.status(400).json({ error: 'Ploteso te gjitha fushat.' });
  }

  const areaNum = Number(area);
  const roomsNum = Number(rooms);

  if (Number.isNaN(areaNum) || Number.isNaN(roomsNum) || areaNum <= 0 || roomsNum <= 0) {
    return res.status(400).json({ error: 'Vlera te pavlefshme per siperfaqe ose dhoma.' });
  }

  const hvacData = gjeneroHVAC(areaNum, roomsNum);

  const sql = 'INSERT INTO projects (name, area, rooms, data, drawing_data) VALUES (?, ?, ?, ?, ?)';
  db.run(sql, [name.trim(), areaNum, roomsNum, JSON.stringify(hvacData), null], function onInsert(err) {
    if (err) {
      return res.status(500).json({ error: 'Gabim gjate ruajtjes ne databaze.' });
    }

    return res.status(201).json({
      id: this.lastID,
      name: name.trim(),
      area: areaNum,
      rooms: roomsNum,
      data: hvacData,
      drawing_data: null,
    });
  });
});

app.get('/projects', (req, res) => {
  const sql = 'SELECT id, name, area, rooms, created_at FROM projects ORDER BY id DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Gabim gjate leximit te projekteve.' });
    }

    return res.json(rows);
  });
});

app.get('/projects/:id', (req, res) => {
  const sql = 'SELECT * FROM projects WHERE id = ?';
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Gabim gjate leximit te projektit.' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Projekti nuk u gjet.' });
    }

    return res.json({
      ...row,
      data: JSON.parse(row.data),
      drawing_data: row.drawing_data || null,
    });
  });
});

app.put('/projects/:id/drawing', (req, res) => {
  const { drawingData } = req.body;

  if (!drawingData || typeof drawingData !== 'string') {
    return res.status(400).json({ error: 'drawingData mungon ose eshte e pavlefshme.' });
  }

  const sql = 'UPDATE projects SET drawing_data = ? WHERE id = ?';
  db.run(sql, [drawingData, req.params.id], function onUpdate(err) {
    if (err) {
      return res.status(500).json({ error: 'Gabim gjate ruajtjes se vizatimit.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Projekti nuk u gjet.' });
    }

    return res.json({ message: 'Vizatimi u ruajt me sukses.' });
  });
});

app.delete('/projects/:id', (req, res) => {
  const sql = 'DELETE FROM projects WHERE id = ?';
  db.run(sql, [req.params.id], function onDelete(err) {
    if (err) {
      return res.status(500).json({ error: 'Gabim gjate fshirjes.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Projekti nuk u gjet.' });
    }

    return res.json({ message: 'Projekti u fshi me sukses.' });
  });
});

app.listen(PORT, () => {
  console.log(`Serveri po punon ne http://localhost:${PORT}`);
  console.log(`Databaza SQLite: ${dbPath}`);
});
