import express from "express";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../middleware/auth.js";
import { getLevelByXp } from "../config/levels.js";
import { ACHIEVEMENTS } from "../config/achievements.js";
import { query } from "../config/db.js";

const router = express.Router();

function updateStreak(user) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const last = user.lastStudyAt ? new Date(user.lastStudyAt) : null;

  if (!last) {
    user.streak = 1;
  } else {
    const sameDay = last.toDateString() === now.toDateString();
    const wasYesterday = last.toDateString() === yesterday.toDateString();
    if (!sameDay) user.streak = wasYesterday ? user.streak + 1 : 1;
  }
  user.lastStudyAt = now;
}

function evaluateAchievements(user, unlockedList) {
  const unlockedSet = new Set(unlockedList);
  for (const ach of ACHIEVEMENTS) {
    if (!unlockedSet.has(ach.key) && ach.rule(user)) unlockedSet.add(ach.key);
  }
  return [...unlockedSet];
}

const XP_ACTIONS = {
  lesson_completed: 10,
  course_completed: 50,
  activity_completed: 5,
  perfect_activity: 15,
  activity_review: 2,
  daily_login: 5,
  weekly_challenge: 100,
  hard_challenge: 150
};

router.get("/me", authMiddleware, async (req, res) => {
  const userResult = await query("SELECT * FROM users WHERE id = $1", [req.userId]);
  if (!userResult.rowCount) return res.status(404).json({ message: "Usuário não encontrado." });
  const user = userResult.rows[0];
  const progressRows = await query("SELECT module_id, percent FROM module_progress WHERE user_id = $1", [req.userId]);
  const moduleProgress = Object.fromEntries(progressRows.rows.map((row) => [row.module_id, row.percent]));

  const { current, next } = getLevelByXp(user.xp);
  return res.json({
    _id: user.id,
    id: user.id,
    fullName: user.full_name,
    displayName: user.display_name,
    birthDate: user.birth_date,
    email: user.email,
    role: user.role,
    profilePhotoUrl: user.profile_photo_url,
    streak: user.streak,
    xp: user.xp,
    weeklyXp: user.weekly_xp,
    monthlyXp: user.monthly_xp,
    moduleProgress,
    level: current,
    xpToNextLevel: next ? next.minXp - user.xp : 0,
    memberSince: user.created_at
  });
});

router.patch("/me", authMiddleware, async (req, res) => {
  const { displayName, profilePhotoUrl, email } = req.body;
  let safeEmail = null;
  if (email) {
    safeEmail = String(email).toLowerCase().trim();
    const existing = await query("SELECT id FROM users WHERE email = $1 AND id <> $2", [safeEmail, req.userId]);
    if (existing.rowCount) return res.status(409).json({ message: "Esse e-mail já está em uso." });
  }
  const updated = await query(
    `UPDATE users
     SET display_name = COALESCE($1, display_name),
         profile_photo_url = COALESCE($2, profile_photo_url),
         email = COALESCE($3, email),
         updated_at = NOW()
     WHERE id = $4
     RETURNING id, display_name, profile_photo_url, email`,
    [displayName ?? null, profilePhotoUrl ?? null, safeEmail, req.userId]
  );
  return res.json(updated.rows[0]);
});

router.post("/me/xp", authMiddleware, async (req, res) => {
  const { action } = req.body;
  const value = XP_ACTIONS[action];
  if (!value) return res.status(400).json({ message: "Ação de XP inválida." });
  const userResult = await query("SELECT * FROM users WHERE id = $1", [req.userId]);
  if (!userResult.rowCount) return res.status(404).json({ message: "Usuário não encontrado." });
  const user = userResult.rows[0];
  const completedCoursesRows = await query("SELECT course_name FROM completed_courses WHERE user_id = $1", [req.userId]);
  const unlockedRows = await query("SELECT achievement_key FROM achievements_unlocked WHERE user_id = $1", [req.userId]);

  const profile = {
    streak: user.streak,
    lastStudyAt: user.last_study_at,
    xp: user.xp,
    weeklyXp: user.weekly_xp,
    monthlyXp: user.monthly_xp,
    stats: {
      lessonsCompleted: user.lessons_completed,
      activitiesDone: user.activities_done,
      perfectActivities: user.perfect_activities
    },
    completedCourses: completedCoursesRows.rows.map((row) => row.course_name)
  };

  const streakBefore = profile.streak || 0;
  profile.xp += value;
  profile.weeklyXp += value;
  profile.monthlyXp += value;
  updateStreak(profile);

  if (action === "daily_login") {
    if (streakBefore < 3 && profile.streak >= 3) {
      profile.xp += 20;
      profile.weeklyXp += 20;
      profile.monthlyXp += 20;
    }
    if (streakBefore < 7 && profile.streak >= 7) {
      profile.xp += 50;
      profile.weeklyXp += 50;
      profile.monthlyXp += 50;
    }
  }

  if (action === "lesson_completed") profile.stats.lessonsCompleted += 1;
  if (action === "activity_completed") profile.stats.activitiesDone += 1;
  if (action === "perfect_activity") profile.stats.perfectActivities += 1;
  if (action === "course_completed" && req.body.courseName) {
    await query(
      "INSERT INTO completed_courses (user_id, course_name) VALUES ($1, $2) ON CONFLICT (user_id, course_name) DO NOTHING",
      [req.userId, req.body.courseName]
    );
    profile.completedCourses.push(req.body.courseName);
  }

  const unlockedKeys = evaluateAchievements(
    profile,
    unlockedRows.rows.map((row) => row.achievement_key)
  );

  await query(
    `UPDATE users
     SET xp = $1, weekly_xp = $2, monthly_xp = $3, streak = $4, last_study_at = $5,
         lessons_completed = $6, activities_done = $7, perfect_activities = $8, updated_at = NOW()
     WHERE id = $9`,
    [
      profile.xp,
      profile.weeklyXp,
      profile.monthlyXp,
      profile.streak,
      profile.lastStudyAt,
      profile.stats.lessonsCompleted,
      profile.stats.activitiesDone,
      profile.stats.perfectActivities,
      req.userId
    ]
  );

  await query("DELETE FROM achievements_unlocked WHERE user_id = $1", [req.userId]);
  for (const key of unlockedKeys) {
    await query("INSERT INTO achievements_unlocked (user_id, achievement_key) VALUES ($1, $2)", [req.userId, key]);
  }

  const { current, next } = getLevelByXp(profile.xp);
  return res.json({
    message: `+${value} XP`,
    xp: profile.xp,
    level: current,
    xpToNextLevel: next ? next.minXp - profile.xp : 0,
    unlockedAchievements: unlockedKeys
  });
});

router.get("/ranking", authMiddleware, async (req, res) => {
  const type = req.query.type || "global";
  const sortField = type === "weekly" ? "weeklyXp" : type === "monthly" ? "monthlyXp" : "xp";

  const users = await query(
    `SELECT id, display_name, profile_photo_url, xp, weekly_xp, monthly_xp
     FROM users
     ORDER BY ${sortField === "weeklyXp" ? "weekly_xp" : sortField === "monthlyXp" ? "monthly_xp" : "xp"} DESC
     LIMIT 50`
  );
  return res.json(
    users.rows.map((user, index) => ({
      _id: user.id,
      displayName: user.display_name,
      profilePhotoUrl: user.profile_photo_url,
      xp: user.xp,
      weeklyXp: user.weekly_xp,
      monthlyXp: user.monthly_xp,
      position: index + 1,
      level: getLevelByXp(user.xp).current
    }))
  );
});

router.get("/achievements", authMiddleware, async (req, res) => {
  const user = await query("SELECT achievement_key FROM achievements_unlocked WHERE user_id = $1", [req.userId]);
  const unlocked = new Set(user.rows.map((row) => row.achievement_key));
  const fullList = ACHIEVEMENTS.map((a) => ({ ...a, unlocked: unlocked.has(a.key) }));
  return res.json(fullList);
});

router.patch("/me/password", authMiddleware, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Preencha todos os campos de senha." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "As senhas não coincidem." });
  }

  const strongPassword = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  if (!strongPassword.test(newPassword)) {
    return res.status(400).json({ message: "Senha fraca. Use 8+ caracteres com maiúscula, minúscula, número e símbolo." });
  }

  const user = await query("SELECT id, password_hash FROM users WHERE id = $1", [req.userId]);
  if (!user.rowCount) return res.status(404).json({ message: "Usuário não encontrado." });
  const ok = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
  if (!ok) return res.status(401).json({ message: "Senha atual inválida." });

  await query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [
    await bcrypt.hash(newPassword, 10),
    req.userId
  ]);
  return res.json({ message: "Senha alterada com sucesso." });
});

router.post("/me/progress", authMiddleware, async (req, res) => {
  const { moduleId, percent } = req.body;
  if (!moduleId || typeof percent !== "number") {
    return res.status(400).json({ message: "Informe módulo e progresso." });
  }
  const safePercent = Math.max(0, Math.min(100, percent));
  const current = await query("SELECT percent FROM module_progress WHERE user_id = $1 AND module_id = $2", [req.userId, moduleId]);
  const currentPercent = current.rowCount ? current.rows[0].percent : 0;
  const finalPercent = Math.max(currentPercent, safePercent);
  await query(
    `INSERT INTO module_progress (user_id, module_id, percent)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, module_id) DO UPDATE SET percent = EXCLUDED.percent, updated_at = NOW()`,
    [req.userId, moduleId, finalPercent]
  );
  return res.json({ moduleId, percent: finalPercent });
});

router.post("/classes", authMiddleware, async (req, res) => {
  const actor = await query("SELECT role FROM users WHERE id = $1", [req.userId]);
  if (!actor.rowCount || !["admin", "professor"].includes(actor.rows[0].role)) {
    return res.status(403).json({ message: "Somente admin/professor pode criar turmas." });
  }

  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Informe o nome da turma." });

  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const created = await query(
    "INSERT INTO classes (name, code, created_by) VALUES ($1, $2, $3) RETURNING id, name, code",
    [name, code, req.userId]
  );
  return res.status(201).json(created.rows[0]);
});

router.post("/classes/join", authMiddleware, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "Informe o código da turma." });
  const classResult = await query("SELECT id, name, code FROM classes WHERE code = $1", [String(code).toUpperCase()]);
  if (!classResult.rowCount) return res.status(404).json({ message: "Turma não encontrada." });

  const turma = classResult.rows[0];
  await query(
    "INSERT INTO class_members (class_id, user_id) VALUES ($1, $2) ON CONFLICT (class_id, user_id) DO NOTHING",
    [turma.id, req.userId]
  );
  return res.json({ message: "Entrada na turma realizada.", turma });
});

router.get("/classes/:classId/leaderboard", authMiddleware, async (req, res) => {
  const members = await query(
    `SELECT u.id, u.display_name, u.xp
     FROM class_members cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.class_id = $1
     ORDER BY u.xp DESC`,
    [req.params.classId]
  );
  return res.json(
    members.rows.map((member, index) => ({
      position: index + 1,
      userId: member.id,
      displayName: member.display_name,
      xp: member.xp,
      level: getLevelByXp(member.xp).current
    }))
  );
});

export default router;
