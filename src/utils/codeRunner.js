import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const MAX_CODE_BYTES = 64 * 1024;
const RUN_TIMEOUT_MS = Number(process.env.CODE_RUN_TIMEOUT_MS || 8000);
const DOCKER_IMAGE = process.env.CODE_RUNNER_IMAGE || "gcc:13-bookworm";

function normalizeOutput(value = "") {
  return String(value).replace(/\r\n/g, "\n").trimEnd();
}

function parseJsonTest(value) {
  try {
    const parsed = JSON.parse(value);
    const expectedStdout = parsed.expectedStdout ?? parsed.stdout ?? parsed.output;
    if (expectedStdout === undefined) return null;
    return {
      stdin: String(parsed.stdin ?? parsed.input ?? ""),
      expectedStdout: String(expectedStdout)
    };
  } catch {
    return null;
  }
}

function parseTextTest(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const jsonTest = parseJsonTest(text);
  if (jsonTest) return jsonTest;

  const normalized = text
    .replace(/entrada\s*:/i, "")
    .replace(/sa[ií]da\s*:/i, "");
  const separator = normalized.includes("=>") ? "=>" : normalized.includes("|") ? "|" : null;
  if (!separator) return null;

  const [stdin, expectedStdout] = normalized.split(separator);
  if (expectedStdout === undefined) return null;

  return {
    stdin: stdin.trim(),
    expectedStdout: expectedStdout.trim()
  };
}

export function buildExecutionTests(activity) {
  const visible = (activity.visible_tests || [])
    .map(parseTextTest)
    .filter(Boolean)
    .map((test) => ({ ...test, hidden: false }));
  const hidden = (activity.hidden_tests || [])
    .map(parseTextTest)
    .filter(Boolean)
    .map((test) => ({ ...test, hidden: true }));
  const tests = [...visible, ...hidden];

  if (tests.length) return tests;

  return [
    {
      stdin: "",
      expectedStdout: activity.correct_answer || "",
      hidden: false
    }
  ];
}

function runProcess(command, args, { input = "", timeoutMs = RUN_TIMEOUT_MS, cwd } = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let resolved = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        resolve({ exitCode: -1, stdout, stderr: error.message, timedOut });
      }
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        resolve({ exitCode, stdout, stderr, timedOut });
      }
    });

    // Handle stdin errors
    child.stdin.on("error", (error) => {
      // Ignore EPIPE errors, just close the stream
      if (error.code !== "EPIPE") {
        clearTimeout(timer);
        if (!resolved) {
          resolved = true;
          resolve({ exitCode: -1, stdout, stderr: error.message, timedOut });
        }
      }
    });

    try {
      child.stdin.end(input);
    } catch (error) {
      // Ignore errors writing to stdin
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({ exitCode: -1, stdout, stderr: error.message, timedOut });
      }
    }
  });
}

async function runCInDocker(code, stdin) {
  const workdir = await mkdtemp(path.join(tmpdir(), "nexttech-c-"));
  try {
    await writeFile(path.join(workdir, "main.c"), code, "utf8");
    return await runProcess(
      "docker",
      [
        "run",
        "--rm",
        "-i",
        "--network",
        "none",
        "--memory",
        "256m",
        "--cpus",
        "1",
        "-v",
        `${workdir}:/workspace:rw`,
        "-w",
        "/workspace",
        DOCKER_IMAGE,
        "sh",
        "-c",
        "gcc main.c -O2 -std=c11 -Wall -Wextra -o main 2>&1 && timeout 3s ./main 2>&1"
      ],
      { input: stdin, timeoutMs: RUN_TIMEOUT_MS }
    );
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

async function runCInLocalProcess(code, stdin) {
  const workdir = await mkdtemp(path.join(tmpdir(), "nexttech-c-"));
  try {
    await writeFile(path.join(workdir, "main.c"), code, "utf8");
    const compile = await runProcess("gcc", ["main.c", "-O2", "-std=c11", "-Wall", "-Wextra", "-o", "main"], {
      cwd: workdir,
      timeoutMs: RUN_TIMEOUT_MS
    });
    if (compile.exitCode !== 0 || compile.timedOut) return compile;
    return await runProcess(path.join(workdir, "main"), [], { input: stdin });
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

export async function evaluateCSubmission({ code, tests }) {
  if (!code || !String(code).trim()) {
    return { ok: false, status: 400, message: "Envie o código para avaliação." };
  }

  if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
    return { ok: false, status: 400, message: "Código muito grande para avaliação." };
  }

  const runnerMode = process.env.CODE_RUNNER_MODE || "docker";
  const results = [];

  for (const [index, test] of tests.entries()) {
    const run =
      runnerMode === "local"
        ? await runCInLocalProcess(code, test.stdin)
        : await runCInDocker(code, test.stdin);

    const actualStdout = normalizeOutput(run.stdout);
    const expectedStdout = normalizeOutput(test.expectedStdout);
    const passed = run.exitCode === 0 && !run.timedOut && actualStdout === expectedStdout;

    results.push({
      index: index + 1,
      hidden: Boolean(test.hidden),
      passed,
      stdin: test.stdin,
      expectedStdout,
      actualStdout,
      stderr: run.stderr,
      timedOut: run.timedOut,
      exitCode: run.exitCode
    });

    if (!passed) break;
  }

  return {
    ok: true,
    isCorrect: results.every((result) => result.passed),
    results
  };
}
