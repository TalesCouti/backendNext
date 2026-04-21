import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    displayName: { type: String, required: true },
    age: { type: Number, required: true, min: 10, max: 15 },
    birthDate: { type: Date, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: "aluno" },
    profilePhotoUrl: { type: String, default: "" },
    streak: { type: Number, default: 0 },
    lastStudyAt: { type: Date },
    xp: { type: Number, default: 0 },
    completedCourses: [{ type: String }],
    unlockedAchievements: [{ type: String }],
    weeklyXp: { type: Number, default: 0 },
    monthlyXp: { type: Number, default: 0 },
    moduleProgress: {
      type: Map,
      of: Number,
      default: {}
    },
    passwordResetCode: { type: String, default: null },
    passwordResetExpiresAt: { type: Date, default: null },
    stats: {
      lessonsCompleted: { type: Number, default: 0 },
      activitiesDone: { type: Number, default: 0 },
      perfectActivities: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
