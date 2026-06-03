# backendNext

API da plataforma educacional.

## Avaliador de código C

O endpoint `POST /api/content/activities/:activityId/submit` avalia desafios do tipo `coding_challenge`.

Por padrão, o backend usa Docker para compilar e executar C em um container isolado:

```env
CODE_RUNNER_MODE=docker
CODE_RUNNER_IMAGE=gcc:13-bookworm
CODE_RUN_TIMEOUT_MS=8000
```

O host precisa ter Docker daemon acessível para o processo Node. Em Render Web Service comum, isso geralmente não fica disponível para criar containers filhos. Nesse caso, use um serviço runner separado com Docker habilitado, ou rode o backend em uma imagem com `gcc` instalado e configure:

```env
CODE_RUNNER_MODE=local
```

## Formato dos testes

Para desafios de código, `expectedAnswer` é a saída esperada padrão quando não há testes parseáveis.

Cada linha de `visibleTests` ou `hiddenTests` pode usar:

```txt
2 3 => 5
```

ou JSON:

```json
{"stdin":"2 3","expectedStdout":"5"}
```

A resposta só é considerada correta quando a saída padrão (`stdout`) do programa bate com a saída esperada.
