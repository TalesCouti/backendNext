export const LEVELS = [
  { level: 1, title: "Aprendiz", minXp: 0 },
  { level: 2, title: "Explorador da Tecnologia", minXp: 100 },
  { level: 3, title: "Estudante de Computação", minXp: 250 },
  { level: 4, title: "Investigador Tecnológico", minXp: 450 },
  { level: 5, title: "Programador Novato", minXp: 700 },
  { level: 6, title: "Pensador Lógico", minXp: 1000 },
  { level: 7, title: "Criador Digital", minXp: 1400 },
  { level: 8, title: "Desenvolvedor Tecnológico", minXp: 1900 },
  { level: 9, title: "Mestre da Computação", minXp: 2500 },
  { level: 10, title: "Lenda da Tecnologia", minXp: 3200 }
];

export function getLevelByXp(xp) {
  let current = LEVELS[0];
  for (const item of LEVELS) {
    if (xp >= item.minXp) current = item;
  }
  const next = LEVELS.find((item) => item.level === current.level + 1) || null;
  return { current, next };
}
