import "dotenv/config";
import bcrypt from "bcryptjs";
import { initDatabase, query, closeDatabase } from "../config/db.js";

const demoUsers = [
  {
    fullName: "Ana Clara Souza",
    displayName: "Ana",
    birthDate: "2013-03-21",
    email: "ana.demo@plataforma.com",
    password: "Demo@1234",
    profilePhotoUrl: "https://i.pravatar.cc/150?img=5",
    streak: 7,
    xp: 1320,
    weeklyXp: 180,
    monthlyXp: 620,
    completedCourses: ["Computação Básica", "Informática Básica"],
    unlockedAchievements: ["primeiro_passo", "mao_na_massa", "sequencia_iniciante", "sequencia_avancada"],
    stats: { lessonsCompleted: 14, activitiesDone: 16, perfectActivities: 6 }
  },
  {
    fullName: "Bruno Martins Lima",
    displayName: "Bruno",
    birthDate: "2011-08-15",
    email: "bruno.demo@plataforma.com",
    password: "Demo@1234",
    profilePhotoUrl: "https://i.pravatar.cc/150?img=12",
    streak: 4,
    xp: 980,
    weeklyXp: 140,
    monthlyXp: 410,
    completedCourses: ["Computação Básica"],
    unlockedAchievements: ["primeiro_passo", "mao_na_massa", "sequencia_iniciante"],
    stats: { lessonsCompleted: 9, activitiesDone: 11, perfectActivities: 3 }
  },
  {
    fullName: "Carla Fernandes Rocha",
    displayName: "Carla",
    birthDate: "2012-01-05",
    email: "carla.demo@plataforma.com",
    password: "Demo@1234",
    profilePhotoUrl: "https://i.pravatar.cc/150?img=26",
    streak: 2,
    xp: 460,
    weeklyXp: 90,
    monthlyXp: 220,
    completedCourses: [],
    unlockedAchievements: ["primeiro_passo"],
    stats: { lessonsCompleted: 4, activitiesDone: 5, perfectActivities: 1 }
  }
];

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Defina DATABASE_URL no arquivo .env");
  }

  await initDatabase();
  console.log("Conectado ao PostgreSQL");

  for (const item of demoUsers) {
    const passwordHash = await bcrypt.hash(item.password, 10);
    await query(
      `INSERT INTO users (
          full_name, display_name, birth_date, email, password_hash, profile_photo_url, role,
          streak, xp, weekly_xp, monthly_xp, lessons_completed, activities_done, perfect_activities, last_study_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'aluno', $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          display_name = EXCLUDED.display_name,
          birth_date = EXCLUDED.birth_date,
          password_hash = EXCLUDED.password_hash,
          profile_photo_url = EXCLUDED.profile_photo_url,
          streak = EXCLUDED.streak,
          xp = EXCLUDED.xp,
          weekly_xp = EXCLUDED.weekly_xp,
          monthly_xp = EXCLUDED.monthly_xp,
          lessons_completed = EXCLUDED.lessons_completed,
          activities_done = EXCLUDED.activities_done,
          perfect_activities = EXCLUDED.perfect_activities,
          last_study_at = NOW()`,
      [
        item.fullName,
        item.displayName,
        item.birthDate,
        item.email,
        passwordHash,
        item.profilePhotoUrl,
        item.streak,
        item.xp,
        item.weeklyXp,
        item.monthlyXp,
        item.stats.lessonsCompleted,
        item.stats.activitiesDone,
        item.stats.perfectActivities
      ]
    );
  }

  console.log("Seed demo finalizado.");
  await closeDatabase();
}

run().catch(async (error) => {
  console.error("Erro no seed:", error.message);
  await closeDatabase();
  process.exit(1);
});
