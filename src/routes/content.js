import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { query } from "../config/db.js";

const router = express.Router();

async function requireCreatorRole(userId) {
  const roleResult = await query("SELECT role FROM users WHERE id = $1", [userId]);
  return roleResult.rowCount && ["admin", "professor"].includes(roleResult.rows[0].role);
}

router.get("/modules", authMiddleware, async (_, res) => {
  const modules = await query(
    `SELECT id, "order", title, description, icon
     FROM modules
     ORDER BY "order" ASC`
  );
  res.json(modules.rows.map((m) => ({ ...m, order: m.order })));
});

router.get("/modules/:moduleId", authMiddleware, async (req, res) => {
  const moduleResult = await query(
    `SELECT id, "order", title, description, icon
     FROM modules WHERE id = $1`,
    [req.params.moduleId]
  );
  if (!moduleResult.rowCount) return res.status(404).json({ message: "Módulo não encontrado." });
  const lessonRows = await query(
    `SELECT id, title, summary, duration_min, video_url
     FROM lessons
     WHERE module_id = $1
     ORDER BY position ASC`,
    [req.params.moduleId]
  );
  return res.json({
    ...moduleResult.rows[0],
    lessons: lessonRows.rows.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      durationMin: lesson.duration_min,
      summary: lesson.summary,
      videoUrl: lesson.video_url,
      contentBlocks: [lesson.summary]
    })),
    interactions: [],
    activities: []
  });
});

router.get("/challenges", authMiddleware, async (_, res) => {
  const challenges = await query(
    "SELECT id, title, type, description, xp_reward, active FROM challenges WHERE active = TRUE ORDER BY created_at DESC"
  );
  res.json(
    challenges.rows.map((c) => ({
      id: c.id,
      title: c.title,
      type: c.type,
      description: c.description,
      xpReward: c.xp_reward,
      active: c.active
    }))
  );
});

router.post("/modules", authMiddleware, async (req, res) => {
  if (!(await requireCreatorRole(req.userId))) {
    return res.status(403).json({ message: "Somente admin/professor pode cadastrar conteúdo." });
  }
  const { id, order, title, description, icon } = req.body;
  if (!id || !order || !title || !description) {
    return res.status(400).json({ message: "Informe id, ordem, título e descrição." });
  }
  const created = await query(
    `INSERT INTO modules (id, "order", title, description, icon, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, "order", title, description, icon`,
    [id, order, title, description, icon || "📘", req.userId]
  );
  return res.status(201).json(created.rows[0]);
});

router.post("/modules/:moduleId/lessons", authMiddleware, async (req, res) => {
  if (!(await requireCreatorRole(req.userId))) {
    return res.status(403).json({ message: "Somente admin/professor pode cadastrar aulas." });
  }
  const { title, summary, durationMin, videoUrl, position } = req.body;
  if (!title || !summary || !videoUrl) {
    return res.status(400).json({ message: "Informe título, resumo e vídeo." });
  }
  const created = await query(
    `INSERT INTO lessons (module_id, title, summary, video_url, duration_min, position)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, module_id, title, summary, video_url, duration_min, position`,
    [req.params.moduleId, title, summary, videoUrl, durationMin || 10, position || 1]
  );
  return res.status(201).json(created.rows[0]);
});

router.post("/challenges", authMiddleware, async (req, res) => {
  if (!(await requireCreatorRole(req.userId))) {
    return res.status(403).json({ message: "Somente admin/professor pode cadastrar desafios." });
  }
  const { title, type, description, xpReward } = req.body;
  if (!title || !type || !description) {
    return res.status(400).json({ message: "Informe título, tipo e descrição do desafio." });
  }
  const created = await query(
    `INSERT INTO challenges (title, type, description, xp_reward, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, type, description, xp_reward, active`,
    [title, type, description, xpReward || 0, req.userId]
  );
  return res.status(201).json({
    ...created.rows[0],
    xpReward: created.rows[0].xp_reward
  });
});

export default router;
