import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { query } from "../config/db.js";
import { buildExecutionTests, evaluateCSubmission } from "../utils/codeRunner.js";
import { normalizeStoredStringArray, normalizeStoredText } from "../utils/text.js";

const router = express.Router();

function isProfessor(role) {
  return role === "professor";
}

async function getActor(userId) {
  const actor = await query("SELECT id, role, display_name FROM users WHERE id = $1", [userId]);
  return actor.rowCount ? actor.rows[0] : null;
}

async function getModuleById(moduleId) {
  const result = await query(
    `SELECT m.id, m."order", m.title, m.description, m.icon, m.created_by, u.display_name AS creator_name
     FROM modules m
     LEFT JOIN users u ON u.id = m.created_by
     WHERE m.id = $1`,
    [moduleId]
  );
  return result.rowCount ? result.rows[0] : null;
}

async function canManageModule(actor, moduleId) {
  const module = await getModuleById(moduleId);
  if (!module) return null;
  if (actor.role === "professor" && module.created_by === actor.id) return module;
  return false;
}

async function ensureManagedClasses(actor, classIds = []) {
  if (!classIds.length) return [];
  const ids = [...new Set(classIds.map(String))];
  const result = await query(
    `SELECT id
     FROM classes
     WHERE id = ANY($1::uuid[])
       AND created_by = $2`,
    [ids, actor.id]
  );

  if (result.rowCount !== ids.length) {
    throw new Error("Uma ou mais turmas informadas nÃ£o pertencem a este professor.");
  }

  return ids;
}

function mapModuleRow(row) {
  return {
    id: row.id,
    order: row.order,
    title: row.title,
    description: row.description,
    icon: row.icon,
    createdBy: row.created_by,
    creatorName: row.creator_name || "Professor",
    classes: row.classes || []
  };
}

async function listModulesForUser(actor, scope = "visible") {
  let whereClause = "";
  const params = [];

  if (scope === "manageable") {
    if (!isProfessor(actor.role)) {
      throw new Error("Somente professores podem consultar conteÃºdo gerenciÃ¡vel.");
    }
    params.push(actor.id);
    whereClause = `WHERE m.created_by = $${params.length}`;
  } else if (actor.role === "professor") {
    params.push(actor.id);
    whereClause = `WHERE m.created_by = $${params.length}`;
  } else if (actor.role === "aluno") {
    params.push(actor.id);
    whereClause = `WHERE NOT EXISTS (
        SELECT 1 FROM class_modules cm_hidden WHERE cm_hidden.module_id = m.id
      )
      OR EXISTS (
        SELECT 1
        FROM class_modules cm_visible
        JOIN class_members mem ON mem.class_id = cm_visible.class_id
        WHERE cm_visible.module_id = m.id AND mem.user_id = $${params.length}
      )`;
  }

  const modules = await query(
    `SELECT
       m.id,
       m."order",
       m.title,
       m.description,
       m.icon,
       m.created_by,
       u.display_name AS creator_name,
       COALESCE(
         json_agg(
           DISTINCT jsonb_build_object('id', c.id, 'name', c.name)
         ) FILTER (WHERE c.id IS NOT NULL),
         '[]'::json
       ) AS classes
     FROM modules m
     LEFT JOIN users u ON u.id = m.created_by
     LEFT JOIN class_modules cm ON cm.module_id = m.id
     LEFT JOIN classes c ON c.id = cm.class_id
     ${whereClause}
     GROUP BY m.id, u.display_name
     ORDER BY m."order" ASC, m.created_at ASC`,
    params
  );

  return modules.rows.map(mapModuleRow);
}

async function loadLessons(moduleId) {
  const lessonRows = await query(
    `SELECT id, title, summary, duration_min, video_url, position
     FROM lessons
     WHERE module_id = $1
     ORDER BY position ASC`,
    [moduleId]
  );
  return lessonRows.rows.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    durationMin: lesson.duration_min,
    summary: lesson.summary,
    videoUrl: lesson.video_url,
    position: lesson.position,
    contentBlocks: lesson.summary
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
  }));
}

async function loadActivities(moduleId) {
  const activityRows = await query(
    `SELECT id, title, activity_type, difficulty, question, options, correct_answer, starter_code, visible_tests, hidden_tests, explanation
     FROM activities
     WHERE module_id = $1
     ORDER BY created_at ASC`,
    [moduleId]
  );
  return activityRows.rows.map((activity) => ({
    id: activity.id,
    title: activity.title,
    type: activity.activity_type,
    difficulty: activity.difficulty,
    question: activity.question,
    options: activity.options,
    expectedAnswer: activity.correct_answer,
    starterCode: activity.starter_code,
    visibleTests: activity.visible_tests,
    hiddenTests: activity.hidden_tests,
    explanation: activity.explanation
  }));
}

router.get("/modules", authMiddleware, async (req, res) => {
  const actor = await getActor(req.userId);
  if (!actor) return res.status(404).json({ message: "UsuÃ¡rio nÃ£o encontrado." });

  try {
    const modules = await listModulesForUser(actor, req.query.scope === "manageable" ? "manageable" : "visible");
    res.json(modules);
  } catch (error) {
    res.status(403).json({ message: error.message });
  }
});

router.get("/modules/:moduleId", authMiddleware, async (req, res) => {
  const actor = await getActor(req.userId);
  if (!actor) return res.status(404).json({ message: "UsuÃ¡rio nÃ£o encontrado." });

  const visibleModules = await listModulesForUser(actor, "visible");
  const module = visibleModules.find((item) => item.id === req.params.moduleId);
  if (!module) return res.status(404).json({ message: "MÃ³dulo nÃ£o encontrado." });

  const [lessons, activities] = await Promise.all([
    loadLessons(req.params.moduleId),
    loadActivities(req.params.moduleId)
  ]);

  return res.json({
    ...module,
    lessons,
    interactions: [],
    activities
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
  const actor = await getActor(req.userId);
  if (!actor || !isProfessor(actor.role)) {
    return res.status(403).json({ message: "Somente professor pode cadastrar conteÃºdo." });
  }

  const id = normalizeStoredText(req.body.id);
  const order = req.body.order;
  const title = normalizeStoredText(req.body.title);
  const description = normalizeStoredText(req.body.description);
  const icon = normalizeStoredText(req.body.icon || "");
  const classIds = Array.isArray(req.body.classIds) ? req.body.classIds : [];
  if (!id || !order || !title || !description) {
    return res.status(400).json({ message: "Informe id, ordem, tÃ­tulo e descriÃ§Ã£o." });
  }

  try {
    const validatedClassIds = await ensureManagedClasses(actor, classIds);
    const created = await query(
      `INSERT INTO modules (id, "order", title, description, icon, created_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, "order", title, description, icon, created_by`,
      [id, order, title, description, icon || "“˜", actor.id]
    );

    for (const classId of validatedClassIds) {
      await query(
        `INSERT INTO class_modules (class_id, module_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (class_id, module_id) DO NOTHING`,
        [classId, id, actor.id]
      );
    }

    return res.status(201).json({
      ...created.rows[0],
      classes: validatedClassIds.map((classId) => ({ id: classId }))
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Falha ao criar mÃ³dulo." });
  }
});

router.patch("/modules/:moduleId", authMiddleware, async (req, res) => {
  const actor = await getActor(req.userId);
  if (!actor || !isProfessor(actor.role)) {
    return res.status(403).json({ message: "Somente professor pode editar conteÃºdo." });
  }

  const module = await canManageModule(actor, req.params.moduleId);
  if (!module) return res.status(404).json({ message: "MÃ³dulo nÃ£o encontrado." });
  if (module === false) return res.status(403).json({ message: "VocÃª nÃ£o pode editar este mÃ³dulo." });

  const order = req.body.order;
  const title = req.body.title ? normalizeStoredText(req.body.title) : null;
  const description = req.body.description ? normalizeStoredText(req.body.description) : null;
  const icon = req.body.icon ? normalizeStoredText(req.body.icon) : null;
  const classIds = req.body.classIds;

  try {
    await query(
      `UPDATE modules
       SET "order" = COALESCE($1, "order"),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           icon = COALESCE($4, icon),
           updated_at = NOW()
       WHERE id = $5`,
      [order ?? null, title ?? null, description ?? null, icon ?? null, req.params.moduleId]
    );

    if (Array.isArray(classIds)) {
      const validatedClassIds = await ensureManagedClasses(actor, classIds);
      await query("DELETE FROM class_modules WHERE module_id = $1", [req.params.moduleId]);
      for (const classId of validatedClassIds) {
        await query(
          `INSERT INTO class_modules (class_id, module_id, assigned_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (class_id, module_id) DO NOTHING`,
          [classId, req.params.moduleId, actor.id]
        );
      }
    }

    const updated = await getModuleById(req.params.moduleId);
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Falha ao atualizar mÃ³dulo." });
  }
});

router.delete("/modules/:moduleId", authMiddleware, async (req, res) => {
  const actor = await getActor(req.userId);
  if (!actor || !isProfessor(actor.role)) {
    return res.status(403).json({ message: "Somente professor pode remover conteÃºdo." });
  }

  const module = await canManageModule(actor, req.params.moduleId);
  if (!module) return res.status(404).json({ message: "MÃ³dulo nÃ£o encontrado." });
  if (module === false) return res.status(403).json({ message: "VocÃª nÃ£o pode remover este mÃ³dulo." });

  await query("DELETE FROM modules WHERE id = $1", [req.params.moduleId]);
  return res.json({ message: "MÃ³dulo removido com sucesso." });
});

router.post("/modules/:moduleId/lessons", authMiddleware, async (req, res) => {
  const actor = await getActor(req.userId);
  if (!actor || !isProfessor(actor.role)) {
    return res.status(403).json({ message: "Somente professor pode cadastrar aulas." });
  }

  const module = await canManageModule(actor, req.params.moduleId);
  if (!module) return res.status(404).json({ message: "MÃ³dulo nÃ£o encontrado." });
  if (module === false) return res.status(403).json({ message: "VocÃª nÃ£o pode editar este mÃ³dulo." });

  const title = normalizeStoredText(req.body.title);
  const summary = normalizeStoredText(req.body.summary);
  const durationMin = req.body.durationMin;
  const videoUrl = normalizeStoredText(req.body.videoUrl || "");
  const position = req.body.position;
  if (!title || !summary) {
    return res.status(400).json({ message: "Informe tÃ­tulo e resumo da aula." });
  }

  const created = await query(
    `INSERT INTO lessons (module_id, title, summary, video_url, duration_min, position, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, module_id, title, summary, video_url, duration_min, position`,
    [req.params.moduleId, title, summary, videoUrl || "", durationMin || 10, position || 1, actor.id]
  );
  return res.status(201).json(created.rows[0]);
});

router.delete("/modules/:moduleId/lessons/:lessonId", authMiddleware, async (req, res) => {
  const actor = await getActor(req.userId);
  if (!actor || !isProfessor(actor.role)) {
    return res.status(403).json({ message: "Somente professor pode remover aulas." });
  }

  const module = await canManageModule(actor, req.params.moduleId);
  if (!module) return res.status(404).json({ message: "MÃ³dulo nÃ£o encontrado." });
  if (module === false) return res.status(403).json({ message: "VocÃª nÃ£o pode editar este mÃ³dulo." });

  const removed = await query("DELETE FROM lessons WHERE id = $1 AND module_id = $2 RETURNING id", [
    req.params.lessonId,
    req.params.moduleId
  ]);
  if (!removed.rowCount) return res.status(404).json({ message: "Aula nÃ£o encontrada." });
  return res.json({ message: "Aula removida com sucesso." });
});

router.post("/modules/:moduleId/activities", authMiddleware, async (req, res) => {
  const actor = await getActor(req.userId);
  if (!actor || !isProfessor(actor.role)) {
    return res.status(403).json({ message: "Somente professor pode criar questÃµes." });
  }

  const module = await canManageModule(actor, req.params.moduleId);
  if (!module) return res.status(404).json({ message: "MÃ³dulo nÃ£o encontrado." });
  if (module === false) return res.status(403).json({ message: "VocÃª nÃ£o pode editar este mÃ³dulo." });

  const title = normalizeStoredText(req.body.title);
  const activityType = normalizeStoredText(req.body.activityType || req.body.type || "multipla_escolha");
  const difficulty = normalizeStoredText(req.body.difficulty || "Fácil");
  const question = normalizeStoredText(req.body.question);
  const options = req.body.options;
  const expectedAnswer = normalizeStoredText(req.body.expectedAnswer);
  const starterCode = normalizeStoredText(req.body.starterCode || "");
  const visibleTests = normalizeStoredStringArray(req.body.visibleTests || []);
  const hiddenTests = normalizeStoredStringArray(req.body.hiddenTests || []);
  const explanation = normalizeStoredText(req.body.explanation);

  if (!["multipla_escolha", "coding_challenge"].includes(activityType)) {
    return res.status(400).json({ message: "Tipo de questão inválido." });
  }

  if (!title || !question || !expectedAnswer || !explanation) {
    return res.status(400).json({ message: "Informe título, pergunta, resposta esperada e explicação." });
  }

  const sanitizedOptions = activityType === "multipla_escolha" ? normalizeStoredStringArray(options || []) : [];
  if (activityType === "multipla_escolha" && sanitizedOptions.length < 2) {
    return res.status(400).json({ message: "Informe pelo menos duas opções para múltipla escolha." });
  }

  if (activityType === "multipla_escolha" && !sanitizedOptions.includes(expectedAnswer)) {
    return res.status(400).json({ message: "A resposta correta precisa estar entre as opÃ§Ãµes." });
  }

  const created = await query(
    `INSERT INTO activities (module_id, title, activity_type, difficulty, question, options, correct_answer, starter_code, visible_tests, hidden_tests, explanation, created_by)
     VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9::text[], $10::text[], $11, $12)
     RETURNING id, title, activity_type, difficulty, question, options, correct_answer, starter_code, visible_tests, hidden_tests, explanation`,
    [
      req.params.moduleId,
      title,
      activityType,
      difficulty || "Fácil",
      question,
      sanitizedOptions,
      expectedAnswer,
      starterCode,
      visibleTests,
      hiddenTests,
      explanation,
      actor.id
    ]
  );

  return res.status(201).json({
    id: created.rows[0].id,
    title: created.rows[0].title,
    type: created.rows[0].activity_type,
    difficulty: created.rows[0].difficulty,
    question: created.rows[0].question,
    options: created.rows[0].options,
    expectedAnswer: created.rows[0].correct_answer,
    starterCode: created.rows[0].starter_code,
    visibleTests: created.rows[0].visible_tests,
    hiddenTests: created.rows[0].hidden_tests,
    explanation: created.rows[0].explanation
  });
});

router.post("/activities/:activityId/submit", authMiddleware, async (req, res) => {
  const activityResult = await query(
    `SELECT id, activity_type, correct_answer, visible_tests, hidden_tests, explanation
     FROM activities
     WHERE id = $1`,
    [req.params.activityId]
  );

  if (!activityResult.rowCount) {
    return res.status(404).json({ message: "Questão não encontrada." });
  }

  const activity = activityResult.rows[0];

  if (activity.activity_type === "multipla_escolha") {
    const answer = normalizeStoredText(req.body.answer);
    const expected = normalizeStoredText(activity.correct_answer);
    const isCorrect = answer.toLowerCase() === expected.toLowerCase();

    return res.json({
      isCorrect,
      explanation: activity.explanation,
      expectedAnswer: isCorrect ? undefined : activity.correct_answer
    });
  }

  if (activity.activity_type !== "coding_challenge") {
    return res.status(400).json({ message: "Tipo de questão inválido." });
  }

  try {
    const evaluation = await evaluateCSubmission({
      code: String(req.body.code || ""),
      tests: buildExecutionTests(activity)
    });

    if (!evaluation.ok) {
      return res.status(evaluation.status || 400).json({ message: evaluation.message });
    }

    return res.json({
      isCorrect: evaluation.isCorrect,
      explanation: activity.explanation,
      tests: evaluation.results.map((result) => {
        if (!result.hidden) return result;
        return {
          index: result.index,
          hidden: true,
          passed: result.passed,
          stderr: result.stderr,
          timedOut: result.timedOut,
          exitCode: result.exitCode
        };
      })
    });
  } catch (error) {
    return res.status(503).json({
      message:
        "Não foi possível executar o código. Verifique se o runner está configurado com Docker ou CODE_RUNNER_MODE=local.",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

router.delete("/modules/:moduleId/activities/:activityId", authMiddleware, async (req, res) => {
  const actor = await getActor(req.userId);
  if (!actor || !isProfessor(actor.role)) {
    return res.status(403).json({ message: "Somente professor pode remover questÃµes." });
  }

  const module = await canManageModule(actor, req.params.moduleId);
  if (!module) return res.status(404).json({ message: "MÃ³dulo nÃ£o encontrado." });
  if (module === false) return res.status(403).json({ message: "VocÃª nÃ£o pode editar este mÃ³dulo." });

  const removed = await query(
    "DELETE FROM activities WHERE id = $1 AND module_id = $2 RETURNING id",
    [req.params.activityId, req.params.moduleId]
  );
  if (!removed.rowCount) return res.status(404).json({ message: "QuestÃ£o nÃ£o encontrada." });
  return res.json({ message: "QuestÃ£o removida com sucesso." });
});

router.post("/challenges", authMiddleware, async (req, res) => {
  const actor = await getActor(req.userId);
  if (!actor || !isProfessor(actor.role)) {
    return res.status(403).json({ message: "Somente professor pode cadastrar desafios." });
  }

  const title = normalizeStoredText(req.body.title);
  const type = normalizeStoredText(req.body.type);
  const description = normalizeStoredText(req.body.description);
  const xpReward = req.body.xpReward;
  if (!title || !type || !description) {
    return res.status(400).json({ message: "Informe tÃ­tulo, tipo e descriÃ§Ã£o do desafio." });
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
