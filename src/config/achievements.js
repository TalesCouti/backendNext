export const ACHIEVEMENTS = [
  { key: "primeiro_passo", title: "Primeiro Passo", description: "Completar a primeira aula", rule: (u) => u.stats.lessonsCompleted >= 1 },
  { key: "mao_na_massa", title: "Mão na Massa", description: "Fazer a primeira atividade", rule: (u) => u.stats.activitiesDone >= 1 },
  { key: "estudante_dedicado", title: "Estudante Dedicado", description: "Completar 10 aulas", rule: (u) => u.stats.lessonsCompleted >= 10 },
  { key: "modulo_concluido", title: "Módulo Concluído", description: "Concluir um módulo inteiro", rule: (u) => u.completedCourses.length >= 1 },
  { key: "sequencia_iniciante", title: "Sequência Iniciante", description: "3 dias consecutivos de estudo", rule: (u) => u.streak >= 3 },
  { key: "sequencia_avancada", title: "Sequência Avançada", description: "7 dias consecutivos de estudo", rule: (u) => u.streak >= 7 }
];
