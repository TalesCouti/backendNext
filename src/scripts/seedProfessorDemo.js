import "dotenv/config";
import bcrypt from "bcryptjs";
import { closeDatabase, query } from "../config/db.js";

const DEMO = {
  email: "professor.demo@nexttech.local",
  password: "Professor@123",
  fullName: "Professor Demo Local",
  displayName: "Prof Demo",
  birthDate: "1990-05-10",
  className: "Turma Demo Local: C Inicial",
  classDescription: "Turma de demonstra\u00e7\u00e3o criada localmente para testar aulas, quest\u00f5es e convite autom\u00e1tico."
};

function generateInviteCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function createUniqueClassCode() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateInviteCode();
    const existing = await query("SELECT 1 FROM classes WHERE code = $1", [code]);
    if (!existing.rowCount) return code;
  }
  throw new Error("N\u00e3o foi poss\u00edvel gerar um c\u00f3digo exclusivo para a turma demo.");
}

async function upsertProfessor() {
  const passwordHash = await bcrypt.hash(DEMO.password, 10);
  const existing = await query("SELECT id FROM users WHERE email = $1", [DEMO.email]);

  if (existing.rowCount) {
    await query(
      `UPDATE users
       SET full_name = $1,
           display_name = $2,
           birth_date = $3,
           password_hash = $4,
           role = 'professor',
           updated_at = NOW()
       WHERE email = $5`,
      [DEMO.fullName, DEMO.displayName, DEMO.birthDate, passwordHash, DEMO.email]
    );
  } else {
    await query(
      `INSERT INTO users (full_name, display_name, birth_date, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'professor')`,
      [DEMO.fullName, DEMO.displayName, DEMO.birthDate, DEMO.email, passwordHash]
    );
  }

  const result = await query("SELECT id FROM users WHERE email = $1", [DEMO.email]);
  return result.rows[0].id;
}

async function cleanupPreviousDemo(userId) {
  await query("DELETE FROM challenges WHERE created_by = $1 AND title LIKE 'Demo Local:%'", [userId]);
  await query("DELETE FROM classes WHERE created_by = $1 AND name = $2", [userId, DEMO.className]);
  await query("DELETE FROM modules WHERE created_by = $1 AND id LIKE 'demo-local-%'", [userId]);
}

async function createClass(userId) {
  const code = await createUniqueClassCode();
  const result = await query(
    `INSERT INTO classes (name, code, description, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, code`,
    [DEMO.className, code, DEMO.classDescription, userId]
  );
  return result.rows[0];
}

async function createModule({ id, order, title, description, icon, userId, classId }) {
  await query(
    `INSERT INTO modules (id, "order", title, description, icon, created_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [id, order, title, description, icon, userId]
  );

  await query(
    `INSERT INTO class_modules (class_id, module_id, assigned_by)
     VALUES ($1, $2, $3)`,
    [classId, id, userId]
  );
}

async function createLesson({ moduleId, title, summary, videoUrl, durationMin, position, userId }) {
  await query(
    `INSERT INTO lessons (module_id, title, summary, video_url, duration_min, position, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [moduleId, title, summary, videoUrl, durationMin, position, userId]
  );
}

async function createActivity({ moduleId, title, difficulty, question, options, expectedAnswer, explanation, userId }) {
  await query(
    `INSERT INTO activities (module_id, title, difficulty, question, options, correct_answer, explanation, created_by)
     VALUES ($1, $2, $3, $4, $5::text[], $6, $7, $8)`,
    [moduleId, title, difficulty, question, options, expectedAnswer, explanation, userId]
  );
}

async function createChallenge({ title, type, description, xpReward, userId }) {
  await query(
    `INSERT INTO challenges (title, type, description, xp_reward, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [title, type, description, xpReward, userId]
  );
}

async function run() {
  const userId = await upsertProfessor();
  await cleanupPreviousDemo(userId);
  const turma = await createClass(userId);

  await createModule({
    id: "demo-local-c-fundamentos",
    order: 1,
    title: "Fundamentos de C",
    description: "Primeiros contatos com sintaxe, vari\u00e1veis, entrada e sa\u00edda em C.",
    icon: "\ud83d\udcbb",
    userId,
    classId: turma.id
  });

  await createModule({
    id: "demo-local-c-condicoes",
    order: 2,
    title: "Decis\u00f5es com if e else",
    description: "Condi\u00e7\u00f5es, compara\u00e7\u00f5es e tomada de decis\u00e3o em programas simples.",
    icon: "\ud83e\udde0",
    userId,
    classId: turma.id
  });

  await createLesson({
    moduleId: "demo-local-c-fundamentos",
    title: "Conhecendo a estrutura do programa em C",
    summary: "Nesta aula o aluno entende o papel da fun\u00e7\u00e3o main(), do include stdio.h e do comando printf().\n\nTamb\u00e9m v\u00ea como um programa em C \u00e9 organizado do in\u00edcio ao fim.",
    videoUrl: "https://www.youtube.com/watch?v=KJgsSFOSQv0",
    durationMin: 12,
    position: 1,
    userId
  });

  await createLesson({
    moduleId: "demo-local-c-fundamentos",
    title: "Vari\u00e1veis, tipos e leitura b\u00e1sica",
    summary: "Esta aula apresenta int, float e char com exemplos simples.\n\nO aluno tamb\u00e9m l\u00ea pequenos trechos de c\u00f3digo e identifica o que cada linha faz.",
    videoUrl: "https://www.youtube.com/watch?v=de2Hsvxaf8M",
    durationMin: 14,
    position: 2,
    userId
  });

  await createLesson({
    moduleId: "demo-local-c-condicoes",
    title: "Tomando decis\u00f5es com if e else",
    summary: "O aluno aprende a comparar valores e executar caminhos diferentes com if e else.\n\nO foco \u00e9 praticar situa\u00e7\u00f5es do cotidiano e l\u00f3gica b\u00e1sica.",
    videoUrl: "https://www.youtube.com/watch?v=aqU9N5LVRKc",
    durationMin: 13,
    position: 1,
    userId
  });

  await createActivity({
    moduleId: "demo-local-c-fundamentos",
    title: "Sa\u00edda no terminal",
    difficulty: "F\u00e1cil",
    question: "Qual fun\u00e7\u00e3o \u00e9 usada para mostrar uma mensagem na tela em C?",
    options: ["scanf()", "printf()", "main()", "return()"],
    expectedAnswer: "printf()",
    explanation: "printf() envia texto e valores para a sa\u00edda padr\u00e3o do programa.",
    userId
  });

  await createActivity({
    moduleId: "demo-local-c-condicoes",
    title: "Condi\u00e7\u00e3o simples",
    difficulty: "M\u00e9dio",
    question: "Qual estrutura usamos para executar um bloco apenas quando uma condi\u00e7\u00e3o \u00e9 verdadeira?",
    options: ["for", "if", "switch", "while"],
    expectedAnswer: "if",
    explanation: "A estrutura if avalia uma condi\u00e7\u00e3o e executa o bloco quando ela \u00e9 verdadeira.",
    userId
  });

  await createChallenge({
    title: "Demo Local: desafio semanal de sa\u00edda",
    type: "weekly",
    description: "Publique um programa que mostre seu nome e sua idade usando printf().",
    xpReward: 80,
    userId
  });

  await createChallenge({
    title: "Demo Local: desafio de condicionais",
    type: "hard",
    description: "Crie um programa que leia uma nota e informe se o aluno foi aprovado com if e else.",
    xpReward: 140,
    userId
  });

  console.log(
    JSON.stringify({
      email: DEMO.email,
      password: DEMO.password,
      classCode: turma.code,
      className: DEMO.className
    })
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
