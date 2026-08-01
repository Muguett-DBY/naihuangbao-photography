import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { parse } from "@babel/parser";

const root = process.cwd();
const sourceRoots = ["src", "functions"];
const sourceExtensions = new Set([".ts", ".tsx"]);
const defaultLineBudget = 500;

// Existing hotspots are ratcheted at their current size. New code must stay below
// the default budget; lowering these entries requires splitting the source file.
const legacyLineBudgets = new Map([
  ["src/pages/PhotoEditorWorkspace.tsx", 1467],
  ["src/experience/three-scene-driver.ts", 1230],
  ["src/components/Gallery.tsx", 1051],
  ["src/components/BookingModal.tsx", 856],
  ["src/lib/editor-effects.ts", 856],
  ["src/components/admin/AdminPhotosTab.tsx", 700],
  ["src/hooks/useGsapAnimations.ts", 574],
  ["src/components/dashboard/BookingsTab.tsx", 545],
  ["src/pages/LoginPage.tsx", 528],
  ["src/components/CinematicPremiere.tsx", 528],
  ["src/components/PublicChatWidget.tsx", 518],
]);

const dependencyRules = [
  {
    from: /^src\/(?:lib|utils)\//,
    to: /^src\/(?:components|pages|layouts)\//,
    message: "shared lib/utils modules cannot depend on UI composition",
  },
  {
    from: /^src\/(?:types|data)\//,
    to: /^src\/(?:components|pages|layouts|hooks|experience|routing)\//,
    message: "types/data modules must remain UI-independent",
  },
  {
    from: /^src\/hooks\//,
    to: /^src\/(?:components|pages|layouts)\//,
    message: "hooks cannot depend on rendered UI modules",
  },
  {
    from: /^src\/components\//,
    to: /^src\/(?:pages|layouts)\//,
    message: "reusable components cannot depend on page/layout composition",
  },
  {
    from: /^src\/features\//,
    to: /^src\/(?:pages|layouts|routing)\//,
    message: "features cannot depend on application route composition",
  },
  {
    from: /^src\/experience\//,
    to: /^src\/(?:components|pages|layouts|hooks|routing)\//,
    message: "the immersive runtime must stay isolated from application UI",
  },
  {
    from: /^functions\//,
    to: /^src\/(?:components|pages|layouts|hooks|experience|routing)\//,
    message: "Cloudflare functions may only share UI-independent domain modules",
  },
  {
    from: /^src\//,
    to: /^functions\//,
    message: "browser code cannot import Cloudflare function handlers",
  },
];

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function collectSourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(absolutePath));
      continue;
    }
    if (!sourceExtensions.has(extname(entry.name))) continue;
    if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name) || entry.name.endsWith(".d.ts")) continue;
    files.push(absolutePath);
  }
  return files;
}

function resolveSourceImport(fromFile, specifier, sourceFileSet) {
  if (!specifier.startsWith(".")) return null;
  const cleanSpecifier = specifier.split(/[?#]/, 1)[0];
  const importExtension = extname(cleanSpecifier);
  if (importExtension && ![".js", ".jsx", ".ts", ".tsx"].includes(importExtension)) return null;

  const absoluteBase = resolve(root, fromFile, "..", cleanSpecifier);
  const candidates = [
    absoluteBase,
    `${absoluteBase}.ts`,
    `${absoluteBase}.tsx`,
    absoluteBase.replace(/\.jsx?$/, ".ts"),
    absoluteBase.replace(/\.jsx?$/, ".tsx"),
    join(absoluteBase, "index.ts"),
    join(absoluteBase, "index.tsx"),
  ];

  for (const candidate of candidates) {
    const relativePath = normalizePath(relative(root, candidate));
    if (sourceFileSet.has(relativePath)) return relativePath;
  }
  return undefined;
}

function findStronglyConnectedComponents(graph) {
  const indexes = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  let nextIndex = 0;

  function visit(node) {
    indexes.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex += 1;
    stack.push(node);
    onStack.add(node);

    for (const dependency of graph.get(node) ?? []) {
      if (!indexes.has(dependency)) {
        visit(dependency);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(dependency)));
      } else if (onStack.has(dependency)) {
        lowLinks.set(node, Math.min(lowLinks.get(node), indexes.get(dependency)));
      }
    }

    if (lowLinks.get(node) !== indexes.get(node)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1) components.push(component.sort());
  }

  for (const node of graph.keys()) {
    if (!indexes.has(node)) visit(node);
  }
  return components;
}

function collectModuleSpecifiers(source, file) {
  const ast = parse(source, {
    sourceType: "module",
    plugins: ["typescript", ...(file.endsWith(".tsx") ? ["jsx"] : []), "importAttributes"],
  });
  const specifiers = [];

  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (
      ["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(node.type)
      && node.source?.type === "StringLiteral"
    ) {
      specifiers.push(node.source.value);
    } else if (node.type === "ImportExpression" && node.source?.type === "StringLiteral") {
      specifiers.push(node.source.value);
    } else if (
      node.type === "CallExpression"
      && node.callee?.type === "Import"
      && node.arguments?.[0]?.type === "StringLiteral"
    ) {
      specifiers.push(node.arguments[0].value);
    }

    for (const [key, value] of Object.entries(node)) {
      if (["loc", "start", "end", "extra", "comments", "tokens", "errors"].includes(key)) continue;
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
      } else {
        visit(value);
      }
    }
  }

  visit(ast.program);
  return specifiers;
}

const absoluteFiles = sourceRoots.flatMap((directory) => collectSourceFiles(resolve(root, directory)));
const sourceFiles = absoluteFiles.map((file) => normalizePath(relative(root, file))).sort();
const sourceFileSet = new Set(sourceFiles);
const graph = new Map(sourceFiles.map((file) => [file, new Set()]));
const errors = [];
const externalImports = new Map();
let edgeCount = 0;

for (const file of sourceFiles) {
  const source = readFileSync(resolve(root, file), "utf8");
  const lineCount = source.split(/\r?\n/).length;
  const lineBudget = legacyLineBudgets.get(file) ?? defaultLineBudget;
  if (lineCount > lineBudget) {
    errors.push(`${file}: ${lineCount} lines exceeds its ${lineBudget}-line architecture budget`);
  }

  let imports;
  try {
    imports = collectModuleSpecifiers(source, file);
  } catch (error) {
    errors.push(`${file}: import parsing failed: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  for (const specifier of imports) {
    if (!specifier.startsWith(".")) {
      const owners = externalImports.get(specifier) ?? [];
      owners.push(file);
      externalImports.set(specifier, owners);
      continue;
    }

    const target = resolveSourceImport(file, specifier, sourceFileSet);
    if (target === undefined) {
      errors.push(`${file}: cannot resolve relative import ${JSON.stringify(specifier)}`);
      continue;
    }
    if (target === null) continue;
    if (!graph.get(file).has(target)) edgeCount += 1;
    graph.get(file).add(target);
  }
}

for (const [source, dependencies] of graph) {
  for (const target of dependencies) {
    for (const rule of dependencyRules) {
      if (rule.from.test(source) && rule.to.test(target)) {
        errors.push(`${source} -> ${target}: ${rule.message}`);
      }
    }
  }
}

for (const component of findStronglyConnectedComponents(graph)) {
  errors.push(`circular dependency: ${component.join(" -> ")}`);
}

for (const bannedPackage of ["react-router-dom"]) {
  const owners = externalImports.get(bannedPackage) ?? [];
  for (const owner of owners) {
    errors.push(`${owner}: imports removed compatibility package ${bannedPackage}`);
  }
}

if (errors.length > 0) {
  console.error(`Architecture check failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Architecture check passed: ${sourceFiles.length} production modules, ${edgeCount} internal imports, no cycles, ${legacyLineBudgets.size} ratcheted hotspots.`,
  );
}
