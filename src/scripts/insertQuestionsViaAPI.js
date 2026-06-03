import fetch from "node-fetch";

const API_BASE = process.env.API_URL || "http://localhost:3000/api";
const PROFESSOR_EMAIL = "professor.c@nexttech.com";
const PROFESSOR_PASSWORD = "ProfC@2026";

let authToken = null;

async function login() {
  console.log("🔐 Autenticando professor...");
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: PROFESSOR_EMAIL,
      password: PROFESSOR_PASSWORD
    })
  });

  if (!response.ok) {
    throw new Error(`Falha no login: ${response.statusText}`);
  }

  const data = await response.json();
  authToken = data.token;
  console.log("✅ Login bem-sucedido!");
  return authToken;
}

async function createActivity(moduleId, activityData) {
  console.log(`\n📝 Criando: "${activityData.title}"...`);

  const response = await fetch(`${API_BASE}/content/modules/${moduleId}/activities`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${authToken}`
    },
    body: JSON.stringify(activityData)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`❌ Erro: ${error.message}`);
    throw error;
  }

  const created = await response.json();
  console.log(`✅ Criada com ID: ${created.id}`);
  return created;
}

async function main() {
  try {
    await login();

    const activities = [
      // Módulo 1: Primeiros passos
      {
        moduleId: "c-introducao",
        data: {
          title: "Seu primeiro programa em C",
          activityType: "coding_challenge",
          difficulty: "Fácil",
          question: "Escreva um programa que exiba seu nome na tela. Use printf para isso.",
          expectedAnswer: "Seu nome aqui",
          starterCode: '#include <stdio.h>\n\nint main(void) {\n    // escreva seu nome aqui\n    return 0;\n}\n',
          visibleTests: ["=> Seu nome aqui"],
          hiddenTests: [],
          explanation: 'Use printf("seu texto") para exibir mensagens. Por exemplo: printf("Olá").'
        }
      },

      // Módulo 2: Variáveis e tipos
      {
        moduleId: "c-variaveis-tipos",
        data: {
          title: "Multiplicando dois inteiros",
          activityType: "coding_challenge",
          difficulty: "Médio",
          question: "Declare duas variáveis inteiras a = 5 e b = 3, calcule o produto delas e imprima o resultado.",
          expectedAnswer: "15",
          starterCode: '#include <stdio.h>\n\nint main(void) {\n    int a = 5, b = 3;\n    // calcule e imprima o produto aqui\n    return 0;\n}\n',
          visibleTests: ["=> 15"],
          hiddenTests: [],
          explanation: 'Use o operador * para multiplicar. printf("%d", a * b) imprime o resultado.'
        }
      },
      {
        moduleId: "c-variaveis-tipos",
        data: {
          title: "Temperatura em Celsius e Fahrenheit",
          activityType: "coding_challenge",
          difficulty: "Médio",
          question: "Declare uma variável celsius com valor 25. Calcule a temperatura em Fahrenheit usando a fórmula F = C * 9/5 + 32 e imprima o resultado sem casas decimais.",
          expectedAnswer: "77",
          starterCode: '#include <stdio.h>\n\nint main(void) {\n    int celsius = 25;\n    // calcule fahrenheit e imprima aqui\n    return 0;\n}\n',
          visibleTests: ["=> 77"],
          hiddenTests: [],
          explanation: 'Celsius 25 * 9/5 + 32 = 77. Use printf("%d", ...) para imprimir sem decimais.'
        }
      },

      // Módulo 3: Operadores e entrada
      {
        moduleId: "c-operadores-entrada",
        data: {
          title: "Produto e resto de dois números",
          activityType: "coding_challenge",
          difficulty: "Difícil",
          question: "Leia dois números, calcule o produto deles e o resto da divisão do primeiro pelo segundo. Imprima ambos em uma linha separados por espaço.",
          expectedAnswer: "21 1",
          starterCode: '#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    // calcule produto e resto, depois imprima\n    return 0;\n}\n',
          visibleTests: ["7 3 => 21 1"],
          hiddenTests: ["10 4 => 40 2"],
          explanation: 'Use * para multiplicação e % para resto. printf("%d %d", a*b, a%b) imprime ambos.'
        }
      },
      {
        moduleId: "c-operadores-entrada",
        data: {
          title: "Verificar número par",
          activityType: "coding_challenge",
          difficulty: "Difícil",
          question: "Leia um número e imprima 1 se for par, 0 se for ímpar (dica: use o operador %).",
          expectedAnswer: "1",
          starterCode: '#include <stdio.h>\n\nint main(void) {\n    int numero;\n    scanf("%d", &numero);\n    // verifique se eh par e imprima 1 ou 0\n    return 0;\n}\n',
          visibleTests: ["4 => 1", "7 => 0"],
          hiddenTests: ["100 => 1", "33 => 0"],
          explanation: 'Um número é par se o resto da divisão por 2 é 0. Use numero % 2 == 0.'
        }
      }
    ];

    console.log("\n🚀 Iniciando inserção de questões via API...\n");

    for (const activity of activities) {
      await createActivity(activity.moduleId, activity.data);
      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log("\n\n✨ Todas as questões foram criadas com sucesso!");
    console.log("📊 Total: 5 questões de compilador adicionadas");

  } catch (error) {
    console.error("\n❌ Erro geral:", error.message);
    process.exitCode = 1;
  }
}

main();
