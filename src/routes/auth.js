import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

const router = express.Router();
const strongPassword = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

router.post("/register", async (req, res) => {
  const { fullName, birthDate, email, password, confirmPassword, role } = req.body;

  if (!fullName || !birthDate || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: "Preencha todos os campos obrigatórios." });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "As senhas não coincidem." });
  }

  if (!strongPassword.test(password)) {
    return res.status(400).json({ message: "Senha fraca. Use 8+ caracteres com maiúscula, minúscula, número e símbolo." });
  }

  const sanitizedEmail = String(email).toLowerCase();
  const existing = await query("SELECT id FROM users WHERE email = $1", [sanitizedEmail]);
  if (existing.rowCount) return res.status(409).json({ message: "E-mail já cadastrado." });

  const passwordHash = await bcrypt.hash(password, 10);
  const displayName = fullName.split(" ")[0];
  const safeRole = role === "admin" || role === "professor" ? role : "aluno";

  const created = await query(
    `INSERT INTO users (full_name, display_name, birth_date, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [fullName, displayName, birthDate, sanitizedEmail, passwordHash, safeRole]
  );

  return res.status(201).json({ id: created.rows[0].id, message: "Cadastro concluído." });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const userResult = await query("SELECT id, password_hash FROM users WHERE email = $1", [email?.toLowerCase()]);
  if (!userResult.rowCount) return res.status(401).json({ message: "Credenciais inválidas." });
  const user = userResult.rows[0];

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: "Credenciais inválidas." });

  const token = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  return res.json({ token });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Informe o e-mail." });

  const user = await query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!user.rowCount) return res.json({ message: "Se o e-mail existir, um código de recuperação foi enviado." });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await query(
    "UPDATE users SET password_reset_code = $1, password_reset_expires_at = $2 WHERE id = $3",
    [code, new Date(Date.now() + 1000 * 60 * 15), user.rows[0].id]
  );

  return res.json({
    message: "Código de recuperação gerado.",
    devCode: code
  });
});

router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword, confirmPassword } = req.body;
  if (!email || !code || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "Preencha todos os campos." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "As senhas não coincidem." });
  }
  if (!strongPassword.test(newPassword)) {
    return res.status(400).json({ message: "Senha fraca. Use 8+ caracteres com maiúscula, minúscula, número e símbolo." });
  }

  const user = await query(
    "SELECT id, password_reset_code, password_reset_expires_at FROM users WHERE email = $1",
    [email.toLowerCase()]
  );
  if (!user.rowCount) {
    return res.status(400).json({ message: "Código inválido ou expirado." });
  }
  const row = user.rows[0];
  if (!row.password_reset_code || !row.password_reset_expires_at) {
    return res.status(400).json({ message: "Código inválido ou expirado." });
  }
  if (new Date(row.password_reset_expires_at).getTime() < Date.now() || row.password_reset_code !== code) {
    return res.status(400).json({ message: "Código inválido ou expirado." });
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
