import express from "express";
import cors from "cors";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("PipelineHQ API is running");
});

app.get("/db-check", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ connected: true, time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.get("/api/leads", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM leads");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/leads", async (req, res) => {
  const l = req.body;
  try {
    await pool.query(
      `INSERT INTO leads (id, company, contact, email, phone, source, stage, value, notes, lost_reason, rep, created_at, last_contacted_at, activities)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (id) DO UPDATE SET
         company=$2, contact=$3, email=$4, phone=$5, source=$6, stage=$7,
         value=$8, notes=$9, lost_reason=$10, rep=$11, last_contacted_at=$13, activities=$14`,
      [l.id, l.company, l.contact, l.email, l.phone, l.source, l.stage, l.value,
       l.notes, l.lostReason, l.rep, l.createdAt, l.lastContactedAt, JSON.stringify(l.activities || [])]
    );
    res.status(201).json(l);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/tasks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM tasks");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/tasks", async (req, res) => {
  const t = req.body;
  try {
    await pool.query(
      `INSERT INTO tasks (id, lead_id, lead_company, rep, title, due_at, done)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET
         lead_id=$2, lead_company=$3, rep=$4, title=$5, due_at=$6, done=$7`,
      [t.id, t.leadId, t.leadCompany, t.rep, t.title, t.dueAt, t.done]
    );
    res.status(201).json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));