import bcrypt from "bcryptjs";
import User from "../models/User.js";

const demoUsers = [
  {
    fullName: "Ana Clara Souza",
    displayName: "Ana",
    age: 12,
    birthDate: new Date("2013-03-21"),
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
    age: 14,
    birthDate: new Date("2011-08-15"),
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
    age: 13,
    birthDate: new Date("2012-01-05"),
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

export async function ensureDemoUsers() {
  for (const item of demoUsers) {
    const passwordHash = await bcrypt.hash(item.password, 10);
    await User.findOneAndUpdate(
      { email: item.email },
      {
        fullName: item.fullName,
        displayName: item.displayName,
        age: item.age,
        birthDate: item.birthDate,
        email: item.email,
        passwordHash,
        profilePhotoUrl: item.profilePhotoUrl,
        streak: item.streak,
        xp: item.xp,
        weeklyXp: item.weeklyXp,
        monthlyXp: item.monthlyXp,
        completedCourses: item.completedCourses,
        unlockedAchievements: item.unlockedAchievements,
        stats: item.stats,
        lastStudyAt: new Date()
      },
      { upsert: true, new: true }
    );
  }
}
