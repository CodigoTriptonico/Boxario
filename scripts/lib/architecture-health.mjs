import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import ts from "typescript";

const RUNTIME_EXTENSION_PATTERN = /\.(?:ts|tsx)$/;
const TEST_FILE_PATTERN = /(?:\.eval)?\.test\./;
const GENERATED_FILE_PATTERN = /\.generated\./;
const RESOLUTION_SUFFIXES = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"];

function isWithin(projectPath, directory) {
  return projectPath.startsWith(normalize(`${directory}/`));
}

function runtimeSourceFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...runtimeSourceFiles(path));
    } else if (
      RUNTIME_EXTENSION_PATTERN.test(entry.name) &&
      !TEST_FILE_PATTERN.test(entry.name)
    ) {
      files.push(normalize(path));
    }
  }

  return files;
}

function importedSpecifiers(source) {
  return ts
    .preProcessFile(source, true, true)
    .importedFiles.map((entry) => entry.fileName);
}

function resolveLocalImport({ from, sourceRoot, fileSet, specifier }) {
  const base = specifier.startsWith("@/")
    ? join(sourceRoot, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(dirname(from), specifier)
      : null;

  if (!base) {
    return null;
  }

  for (const suffix of RESOLUTION_SUFFIXES) {
    const candidate = normalize(`${base}${suffix}`);
    if (fileSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function stronglyConnectedComponents(graph) {
  let nextIndex = 0;
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];

  function visit(node) {
    indices.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const dependency of graph.get(node) || []) {
      if (!indices.has(dependency)) {
        visit(dependency);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(dependency)));
      } else if (onStack.has(dependency)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indices.get(dependency)));
      }
    }

    if (lowLinks.get(node) !== indices.get(node)) {
      return;
    }

    const component = [];
    let current;
    do {
      current = stack.pop();
      onStack.delete(current);
      component.push(current);
    } while (current !== node);

    const selfCycle = component.length === 1 && graph.get(node)?.includes(node);
    if (component.length > 1 || selfCycle) {
      components.push(component);
    }
  }

  for (const node of graph.keys()) {
    if (!indices.has(node)) {
      visit(node);
    }
  }

  return components;
}

export function analyzeArchitecture(root, { maxLines = Number.POSITIVE_INFINITY } = {}) {
  const sourceRoot = join(root, "src");
  const files = runtimeSourceFiles(sourceRoot);
  const fileSet = new Set(files);
  const graph = new Map(files.map((file) => [file, []]));
  const issues = [];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const projectPath = relative(root, file);
    const lineCount = source.split(/\r?\n/).length;

    if (lineCount > maxLines && !GENERATED_FILE_PATTERN.test(file)) {
      issues.push({
        type: "max-lines",
        file: projectPath,
        lines: lineCount,
        maxLines,
      });
    }

    for (const specifier of importedSpecifiers(source)) {
      const libImportsUpperLayer =
        isWithin(projectPath, "src/lib") &&
        (specifier.startsWith("@/app/actions/") ||
          specifier.startsWith("@/components/"));
      const actionImportsUi =
        isWithin(projectPath, "src/app/actions") &&
        specifier.startsWith("@/components/");

      if (libImportsUpperLayer || actionImportsUi) {
        issues.push({
          type: "layer",
          file: projectPath,
          dependency: specifier,
        });
      }

      const dependency = resolveLocalImport({
        from: file,
        sourceRoot,
        fileSet,
        specifier,
      });
      if (dependency) {
        graph.get(file).push(dependency);
      }
    }
  }

  for (const component of stronglyConnectedComponents(graph)) {
    issues.push({
      type: "cycle",
      files: component.map((file) => relative(root, file)).sort(),
    });
  }

  return {
    files: files.length,
    issues,
  };
}

export function formatArchitectureIssue(issue) {
  if (issue.type === "cycle") {
    return `cycle: ${issue.files.join(" -> ")}`;
  }
  if (issue.type === "layer") {
    return `layer: ${issue.file} imports ${issue.dependency}`;
  }
  return `max-lines: ${issue.file} has ${issue.lines} lines (max ${issue.maxLines})`;
}
