import "dotenv/config";
import bcrypt from "bcryptjs";
import { closeDatabase, initDatabase, query } from "../config/db.js";

const professor = {
  fullName: "Professor Linguagem C",
  displayName: "Professor",
  birthDate: "1985-05-20",
  email: "professor.c@nexttech.com",
  password: "ProfC@2026"
};

const turma = {
  name: "Introducao a Linguagem C",
  code: "C2026",
  description: "Turma inicial para aprender fundamentos da linguagem C com aulas em portugues."
};

const modules = [
  {
    id: "c-introducao",
    order: 1,
    title: "Primeiros passos em C",
    description: "Estrutura basica de um programa, funcao main, compilacao e o primeiro Hello World.",
    icon: "code",
    lessons: [
      {
        title: "Primeiro programa em C",
        summary: "Entenda a funcao main e a estrutura minima de um programa em C.",
        videoUrl: "https://www.youtube.com/watch?v=ZYNCXzxVclQ",
        durationMin: 12,
        position: 1
      },
      {
        title: "Hello World em C",
        summary: "Use stdio.h e printf para exibir a primeira mensagem no terminal.",
        videoUrl: "https://www.youtube.com/watch?v=LB9YMmmfnyc",
        durationMin: 10,
        position: 2
      }
    ],
    activities: [
      {
        title: "Funcao principal",
        activityType: "multipla_escolha",
        difficulty: "Facil",
        question: "Qual funcao marca o ponto de entrada mais comum de um programa em C?",
        options: ["main", "start", "init", "program"],
        correctAnswer: "main",
        explanation: "A execucao de um programa C normalmente comeca pela funcao main."
      },
      {
        title: "Imprimindo uma mensagem",
        activityType: "coding_challenge",
        difficulty: "Facil",
        question: "Complete um programa em C que exiba a mensagem Ola, C! no terminal.",
        starterCode: "#include <stdio.h>\n\nint main(void) {\n    // escreva sua solucao aqui\n    return 0;\n}\n",
        visibleTests: ["=> Ola, C!"],
        hiddenTests: [],
        correctAnswer: "Ola, C!",
        explanation: "A biblioteca stdio.h fornece printf, que escreve texto na saida padrao."
      },
      {
        title: "Seu primeiro programa em C",
        activityType: "coding_challenge",
        difficulty: "Facil",
        question: "Escreva um programa que exiba seu nome na tela. Use printf para isso.",
        starterCode: "#include <stdio.h>\n\nint main(void) {\n    // escreva seu nome aqui\n    return 0;\n}\n",
        visibleTests: ["=> Seu nome aqui"],
        hiddenTests: [],
        correctAnswer: "Seu nome aqui",
        explanation: "Use printf(\"seu texto\") para exibir mensagens. Por exemplo: printf(\"Olá\")."
      }
    ]
  },
  {
    id: "c-variaveis-tipos",
    order: 2,
    title: "Variaveis e tipos de dados",
    description: "Declaracao de variaveis, nomes validos, tipos primitivos e formatos de saida.",
    icon: "braces",
    lessons: [
      {
        title: "Caracteristicas das variaveis",
        summary: "Conheca o papel das variaveis para armazenar valores durante a execucao.",
        videoUrl: "https://www.youtube.com/watch?v=72oa9i7t-CY",
        durationMin: 11,
        position: 1
      },
      {
        title: "Tipos primitivos do C",
        summary: "Veja tipos como int, float, char e void, alem de quando usar cada um.",
        videoUrl: "https://www.youtube.com/watch?v=C_OUqQKVG8E",
        durationMin: 13,
        position: 2
      }
    ],
    activities: [
      {
        title: "Tipo para numeros inteiros",
        activityType: "multipla_escolha",
        difficulty: "Facil",
        question: "Qual tipo e usado normalmente para armazenar numeros inteiros em C?",
        options: ["int", "char", "float", "void"],
        correctAnswer: "int",
        explanation: "O tipo int representa numeros inteiros, como 10, -3 e 0."
      },
      {
        title: "Declarando idade",
        activityType: "coding_challenge",
        difficulty: "Facil",
        question: "Declare uma variavel inteira chamada idade com valor 18 e imprima esse valor.",
        starterCode: "#include <stdio.h>\n\nint main(void) {\n    // declare a variavel aqui\n    return 0;\n}\n",
        visibleTests: ["=> 18"],
        hiddenTests: [],
        correctAnswer: "18",
        explanation: "Em C, declaramos o tipo antes do nome da variavel e usamos printf para imprimir."
      },
      {
        title: "Multiplicando dois inteiros",
        activityType: "coding_challenge",
        difficulty: "Medio",
        question: "Declare duas variaveis inteiras a = 5 e b = 3, calcule o produto delas e imprima o resultado.",
        starterCode: "#include <stdio.h>\n\nint main(void) {\n    int a = 5, b = 3;\n    // calcule e imprima o produto aqui\n    return 0;\n}\n",
        visibleTests: ["=> 15"],
        hiddenTests: [],
        correctAnswer: "15",
        explanation: "Use o operador * para multiplicar. printf(\"%d\", a * b) imprime o resultado."
      },
      {
        title: "Temperatura em Celsius e Fahrenheit",
        activityType: "coding_challenge",
        difficulty: "Medio",
        question: "Declare uma variavel celsius com valor 25. Calcule a temperatura em Fahrenheit usando a formula F = C * 9/5 + 32 e imprima o resultado sem casas decimais.",
        starterCode: "#include <stdio.h>\n\nint main(void) {\n    int celsius = 25;\n    // calcule fahrenheit e imprima aqui\n    return 0;\n}\n",
        visibleTests: ["=> 77"],
        hiddenTests: [],
        correctAnswer: "77",
        explanation: "Celsius 25 * 9/5 + 32 = 77. Use printf(\"%d\", ...) para imprimir sem decimais."
      }
    ]
  },
  {
    id: "c-operadores-entrada",
    order: 3,
    title: "Operadores e entrada de dados",
    description: "Operacoes aritmeticas, resto da divisao e leitura de dados digitados pelo usuario.",
    icon: "terminal",
    lessons: [
      {
        title: "Operacoes matematicas",
        summary: "Aprenda a usar operadores aritmeticos para calcular valores em C.",
        videoUrl: "https://www.youtube.com/watch?v=mEeclaJEF2w",
        durationMin: 12,
        position: 1
      },
      {
        title: "Entrada de dados",
        summary: "Use scanf para receber valores digitados e armazenar em variaveis.",
        videoUrl: "https://www.youtube.com/watch?v=siSjWK65LuQ",
        durationMin: 10,
        position: 2
      }
    ],
    activities: [
      {
        title: "Operador de resto",
        activityType: "multipla_escolha",
        difficulty: "Medio",
        question: "Qual operador retorna o resto de uma divisao inteira em C?",
        options: ["%", "/", "*", "//"],
        correctAnswer: "%",
        explanation: "O operador % retorna o resto da divisao, por exemplo 5 % 2 resulta em 1."
      },
      {
        title: "Soma de dois inteiros",
        activityType: "coding_challenge",
        difficulty: "Medio",
        question: "Leia dois inteiros a e b e imprima a soma deles.",
        starterCode: "#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    // imprima a soma aqui\n    return 0;\n}\n",
        visibleTests: ["2 3 => 5", "-1 4 => 3"],
        hiddenTests: ["10 5 => 15"],
        correctAnswer: "5",
        explanation: "Depois de ler a e b com scanf, a expressao a + b calcula a soma."
      },
      {
        title: "Produto e resto de dois numeros",
        activityType: "coding_challenge",
        difficulty: "Dificil",
        question: "Leia dois numeros, calcule o produto deles e o resto da divisao do primeiro pelo segundo. Imprima ambos em uma linha separados por espaco.",
        starterCode: "#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf(\"%d %d\", &a, &b);\n    // calcule produto e resto, depois imprima\n    return 0;\n}\n",
        visibleTests: ["7 3 => 21 1"],
        hiddenTests: ["10 4 => 40 2"],
        correctAnswer: "21 1",
        explanation: "Use * para multiplicacao e % para resto. printf(\"%d %d\", a*b, a%b) imprime ambos."
      },
      {
        title: "Verificar numero par",
        activityType: "coding_challenge",
        difficulty: "Dificil",
        question: "Leia um numero e imprima 1 se for par, 0 se for impar (dica: use o operador %).",
        starterCode: "#include <stdio.h>\n\nint main(void) {\n    int numero;\n    scanf(\"%d\", &numero);\n    // verifique se eh par e imprima 1 ou 0\n    return 0;\n}\n",
        visibleTests: ["4 => 1", "7 => 0"],
        hiddenTests: ["100 => 1", "33 => 0"],
        correctAnswer: "1",
        explanation: "Um numero eh par se o resto da divisao por 2 eh 0. Use numero % 2 == 0."
      }
    ]
  }
];

async function upsertProfessor() {
  const passwordHash = await bcrypt.hash(professor.password, 10);
  const result = await query(
    `INSERT INTO users (full_name, display_name, birth_date, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5, 'professor')
     ON CONFLICT (email)
     DO UPDATE SET
       full_name = EXCLUDED.full_name,
       display_name = EXCLUDED.display_name,
       birth_date = EXCLUDED.birth_date,
       password_hash = EXCLUDED.password_hash,
       role = 'professor',
       updated_at = NOW()
     RETURNING id`,
    [professor.fullName, professor.displayName, professor.birthDate, professor.email, passwordHash]
  );

  return result.rows[0].id;
}

async function upsertClass(professorId) {
  const result = await query(
    `INSERT INTO classes (name, code, description, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (code)
     DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       created_by = EXCLUDED.created_by
     RETURNING id, code`,
    [turma.name, turma.code, turma.description, professorId]
  );

  return result.rows[0];
}

async function replaceModuleContent(module, professorId, classId) {
  await query(
    `INSERT INTO modules (id, "order", title, description, icon, created_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (id)
     DO UPDATE SET
       "order" = EXCLUDED."order",
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       icon = EXCLUDED.icon,
       created_by = EXCLUDED.created_by,
       updated_at = NOW()`,
    [module.id, module.order, module.title, module.description, module.icon, professorId]
  );

  await query("DELETE FROM lessons WHERE module_id = $1 AND created_by = $2", [module.id, professorId]);
  await query("DELETE FROM activities WHERE module_id = $1 AND created_by = $2", [module.id, professorId]);

  for (const lesson of module.lessons) {
    await query(
      `INSERT INTO lessons (module_id, title, summary, video_url, duration_min, position, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [module.id, lesson.title, lesson.summary, lesson.videoUrl, lesson.durationMin, lesson.position, professorId]
    );
  }

  for (const activity of module.activities) {
    await query(
      `INSERT INTO activities (
        module_id, title, activity_type, difficulty, question, options, correct_answer,
        starter_code, visible_tests, hidden_tests, explanation, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6::text[], $7, $8, $9::text[], $10::text[], $11, $12)`,
      [
        module.id,
        activity.title,
        activity.activityType,
        activity.difficulty,
        activity.question,
        activity.options || [],
        activity.correctAnswer,
        activity.starterCode || "",
        activity.visibleTests || [],
        activity.hiddenTests || [],
        activity.explanation,
        professorId
      ]
    );
  }

  await query(
    `INSERT INTO class_modules (class_id, module_id, assigned_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (class_id, module_id) DO NOTHING`,
    [classId, module.id, professorId]
  );
}

async function main() {
  await initDatabase();
  const professorId = await upsertProfessor();
  const createdClass = await upsertClass(professorId);

  for (const module of modules) {
    await replaceModuleContent(module, professorId, createdClass.id);
  }

  console.log("Seed concluido.");
  console.log(`Professor: ${professor.email}`);
  console.log(`Senha: ${professor.password}`);
  console.log(`Turma: ${turma.name}`);
  console.log(`Codigo da turma: ${createdClass.code}`);
}

main()
  .catch((error) => {
    console.error("Falha ao executar seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
