import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  console.log("C++ Dead Function Finder (Call-Based) is now active!");

  const decorationType = vscode.window.createTextEditorDecorationType({
    opacity: "0.4",
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    isWholeLine: false,
  });

  let timeout: NodeJS.Timeout | undefined = undefined;

  async function findDeadFunctions() {
    const editor = vscode.window.activeTextEditor;
    if (
      !editor ||
      (!editor.document.fileName.endsWith(".cpp") &&
        !editor.document.fileName.endsWith(".h") &&
        !editor.document.fileName.endsWith(".hpp"))
    ) {
      return;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(
      editor.document.uri,
    );
    if (!workspaceFolder) {
      return;
    }

    const projectRoot = workspaceFolder.uri.fsPath;

    // Ищем все .cpp и .h файлы в проекте
    const files = await findFiles(projectRoot, ["*.cpp", "*.h"]);

    // Собираем все функции из текущего файла
    const currentText = editor.document.getText();
    const definedFunctions = extractFunctionNames(currentText);

    if (definedFunctions.length === 0) {
      editor.setDecorations(decorationType, []);
      return;
    }

    // Исключаем `main` из проверки
    const functionsToCheck = definedFunctions.filter((name) => name !== "main");

    // Считаем, сколько раз **вызывается** каждая функция (имя + `(`)
    const callCount: Map<string, number> = new Map();
    for (const funcName of functionsToCheck) {
      callCount.set(funcName, 0);
    }

    for (const file of files) {
      const content = fs.readFileSync(file, "utf8");
      for (const funcName of functionsToCheck) {
        // Ищем: `funcName(` — это вызов функции (с учётом пробелов)
        const regex = new RegExp(`\\b${funcName}\\s*\\(`, "g");
        const matches = content.match(regex);
        if (matches) {
          // Подсчитываем количество совпадений
          let count = matches.length;

          // Если это текущий файл — исключаем **определение функции**
          if (file === editor.document.uri.fsPath) {
            // Ищем определение: `funcName(...){`
            const defRegex = new RegExp(
              `\\b${funcName}\\s*\\([^)]*\\)\\s*\\{`,
              "g",
            );
            const defMatches = content.match(defRegex);
            if (defMatches) {
              count -= defMatches.length; // вычитаем определения
            }
          }

          if (count > 0) {
            callCount.set(funcName, (callCount.get(funcName) || 0) + count);
          }
        }
      }
    }

    // Функция считается "мертвой", если она **никогда не вызывается**
    const deadRanges: vscode.Range[] = [];

    for (const funcName of functionsToCheck) {
      const count = callCount.get(funcName) || 0;
      if (count === 0) {
        // функция нигде не вызывается
        const range = findFunctionRange(editor.document, funcName);
        if (range) {
          deadRanges.push(range);
          console.log(`Dead function: ${funcName} (called ${count} times)`);
        }
      } else {
        console.log(`Function ${funcName} is called ${count} times.`);
      }
    }

    editor.setDecorations(decorationType, deadRanges);
  }

  // Ищет все файлы с расширениями в директории
  async function findFiles(dir: string, patterns: string[]): Promise<string[]> {
    const result: string[] = [];
    const items = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        result.push(...(await findFiles(fullPath, patterns)));
      } else if (patterns.some((p) => item.name.endsWith(p.replace("*", "")))) {
        result.push(fullPath);
      }
    }

    return result;
  }

  // Извлекает имена функций из текста
  function extractFunctionNames(text: string): string[] {
    const lines = text.split("\n");
    const functions: string[] = [];

    for (const line of lines) {
      // Ищем: `returnType name(` или `name(` в начале строки
      const match = line.match(/^\s*(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*\{/);
      if (match) {
        functions.push(match[1]);
      }
    }

    return [...new Set(functions)]; // уникальные
  }

  // Находит позицию определения функции в документе
  function findFunctionRange(
    document: vscode.TextDocument,
    funcName: string,
  ): vscode.Range | null {
    const text = document.getText();
    const lines = text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/^\s*(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*\{/);
      if (match && match[1] === funcName) {
        const index = line.indexOf(funcName);
        if (index === -1) continue;

        const start = new vscode.Position(i, index);
        const end = new vscode.Position(i, index + funcName.length);
        return new vscode.Range(start, end);
      }
    }

    return null;
  }

  // Событие при изменении текста
  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (
        vscode.window.activeTextEditor &&
        event.document === vscode.window.activeTextEditor.document
      ) {
        clearTimeout(timeout);
        timeout = setTimeout(findDeadFunctions, 1000);
      }
    },
    null,
    context.subscriptions,
  );

  // При открытии/переключении редактора
  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      if (
        editor &&
        (editor.document.languageId === "cpp" ||
          editor.document.languageId === "c")
      ) {
        findDeadFunctions();
      }
    },
    null,
    context.subscriptions,
  );

  // Запускаем сразу при открытии
  if (
    vscode.window.activeTextEditor &&
    (vscode.window.activeTextEditor.document.languageId === "cpp" ||
      vscode.window.activeTextEditor.document.languageId === "c")
  ) {
    findDeadFunctions();
  }

  // Регистрируем команду
  let disposable = vscode.commands.registerCommand(
    "cpp-dead-function-finder.findDeadFunctions",
    findDeadFunctions,
  );
  context.subscriptions.push(disposable);
}

export function deactivate() {}
