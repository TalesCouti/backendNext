import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";
import { normalizeStoredText } from "../utils/text.js";

const router = express.Router();
const strongPassword = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function normalizeRequestedRole(role) {
  return role === "professor" ? "professor" : "aluno";
}

async function createUser({ fullName, birthDate, email, password, confirmPassword, role }) {
  if (!fullName || !birthDate || !email || !password || !confirmPassword) {
    return { status: 400, body: { message: "Preencha todos os campos obrigatÃ³rios." } };
  }

  if (password !== confirmPassword) {
    return { status: 400, body: { message: "As senhas nÃ£o coincidem." } };
  }

  if (!strongPassword.test(password)) {
    return { status: 400, body: { message: "Senha fraca. Use 8+ caracteres com maiÃºscula, minÃºscula, nÃºmero e sÃ­mbolo." } };
  }

  const sanitizedEmail = String(email).toLowerCase().trim();
  const normalizedFullName = normalizeStoredText(fullName);
  const existing = await query("SELECT id FROM users WHERE email = $1", [sanitizedEmail]);
  if (existing.rowCount) {
    return { status: 409, body: { message: "E-mail jÃ¡ cadastrado." } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const displayName = normalizedFullName.split(/\s+/)[0];
  const created = await query(
    `INSERT INTO users (full_name, display_name, birth_date, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, role`,
    [normalizedFullName, displayName, birthDate, sanitizedEmail, passwordHash, role]
  );

  return {
    status: 201,
    body: {
      id: created.rows[0].id,
      role: created.rows[0].role,
      message: "Cadastro concluÃ­do."
    }
  };
}

router.post("/register", async (req, res) => {
  const requestedRole = normalizeRequestedRole(req.body.role);
  const result = await createUser({ ...req.body, role: requestedRole });
  return res.status(result.status).json(result.body);
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const userResult = await query("SELECT id, password_hash, role FROM users WHERE email = $1", [email?.toLowerCase()]);
  if (!userResult.rowCount) return res.status(401).json({ message: "Credenciais invÃ¡lidas." });
  const user = userResult.rows[0];

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Credenciais invÃ¡lidas." });

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Informe o e-mail." });

  const user = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!user.rowCount) return res.json({ message: "Se o e-mail existir, um cÃ³digo de recuperaÃ§Ã£o foi enviado." });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await query(
    "UPDATE users SET password_reset_code = $1, password_reset_expires_at = $2 WHERE id = $3",
    [code, new Date(Date.now() + 1000 * 60 * 15), user.rows[0].id]
  );

  return res.json({
    message: "CÃ³digo de recuperaÃ§Ã£o gerado.",
    devCode: code
  });
});

router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword, confirmPassword } = req.body;
  if (!email || !code || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Preencha todos os campos." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "As senhas nÃ£o coincidem." });
  }
  if (!strongPassword.test(newPassword)) {
    return res.status(400).json({ message: "Senha fraca. Use 8+ caracteres com maiÃºscula, minÃºscula, nÃºmero e sÃ­mbolo." });
  }

  const user = await query(
    "SELECT id, password_reset_code, password_reset_expires_at FROM users WHERE email = $1",
    [email.toLowerCase()]
  );
  if (!user.rowCount) {
    return res.status(400).json({ message: "CÃ³digo invÃ¡lido ou expirado." });
  }
  const row = user.rows[0];
  if (!row.password_reset_code || !row.password_reset_expires_at) {
    return res.status(400).json({ message: "CÃ³digo invÃ¡lido ou expirado." });
  }
  if (new Date(row.password_reset_expires_at).getTime() < Date.now() || row.password_reset_code !== code) {
    return res.status(400).json({ message: "CÃ³digo invÃ¡lido ou expirado." });
  }

  await query(
    `UPDATE users
     SET password_hash = $1, password_reset_code = NULL, password_reset_expires_at = NULL
     WHERE id = $2`,
    [await bcrypt.hash(newPassword, 10), row.id]
  );
  return res.json({ message: "Senha redefinida com sucesso." });
});

export default router;

