"use strict";
const electron = require("electron");
const path = require("path");
const promises = require("fs/promises");
const fs = require("fs");
const utils = require("@electron-toolkit/utils");
function sortFileNodes(nodes) {
  return nodes.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}
const MD_EXTENSIONS = [".md", ".markdown", ".mdx", ".txt"];
let mainWindow = null;
let pendingFile = null;
function isMarkdownFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MD_EXTENSIONS.includes(ext);
}
function openFile(filePath) {
  if (!mainWindow) return;
  promises.readFile(filePath, "utf-8").then((content) => {
    mainWindow.webContents.send("file:opened", { path: filePath, content });
  }).catch(() => {
  });
}
function createWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#00000000",
      symbolColor: "#888888",
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    },
    backgroundColor: "#0f0f0f"
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
    if (pendingFile) {
      openFile(pendingFile);
      pendingFile = null;
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
async function readFileTree(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = await promises.readdir(dirPath, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "out" || entry.name === "dist") continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const children = await readFileTree(fullPath);
      nodes.push({
        name: entry.name,
        path: fullPath,
        isDirectory: true,
        children,
        expanded: false
      });
    } else {
      nodes.push({
        name: entry.name,
        path: fullPath,
        isDirectory: false
      });
    }
  }
  return sortFileNodes(nodes);
}
function registerIPC() {
  electron.ipcMain.handle("file:read", async (_event, filePath) => {
    try {
      const content = await promises.readFile(filePath, "utf-8");
      return content;
    } catch {
      return "";
    }
  });
  electron.ipcMain.handle("file:write", async (_event, filePath, content) => {
    await promises.writeFile(filePath, content, "utf-8");
  });
  electron.ipcMain.handle("file:delete", async (_event, filePath) => {
    await promises.unlink(filePath);
  });
  electron.ipcMain.handle("file:rename", async (_event, oldPath, newName) => {
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    await promises.rename(oldPath, newPath);
    return newPath;
  });
  electron.ipcMain.handle("file:create", async (_event, filePath, isDir) => {
    if (isDir) {
      await promises.mkdir(filePath, { recursive: true });
    } else {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) await promises.mkdir(dir, { recursive: true });
      await promises.writeFile(filePath, "", "utf-8");
    }
  });
  electron.ipcMain.handle("file:tree", async (_event, dirPath) => {
    return readFileTree(dirPath);
  });
  electron.ipcMain.handle("file:open-dialog", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [
        { name: "Markdown", extensions: ["md", "markdown", "mdx", "txt"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    return result.filePaths.length > 0 ? result.filePaths[0] : null;
  });
  electron.ipcMain.handle("file:open-folder-dialog", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"]
    });
    return result.filePaths.length > 0 ? result.filePaths[0] : null;
  });
  electron.ipcMain.handle("file:save-dialog", async (_event, defaultName) => {
    const result = await electron.dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [
        { name: "Markdown", extensions: ["md"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    return result.filePath || null;
  });
  electron.ipcMain.handle("app:get-version", () => {
    return electron.app.getVersion();
  });
  electron.ipcMain.handle("theme:change", (_event, theme) => {
    electron.nativeTheme.themeSource = theme;
  });
  electron.ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
  });
  electron.ipcMain.handle("window:maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  electron.ipcMain.handle("window:close", () => {
    mainWindow?.close();
  });
  electron.ipcMain.handle("window:is-maximized", () => {
    return mainWindow?.isMaximized() || false;
  });
}
const gotTheLock = electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  electron.app.quit();
} else {
  electron.app.on("second-instance", (_event, argv) => {
    const fileArg = findFileArg(argv);
    if (fileArg) {
      if (mainWindow) {
        openFile(fileArg);
      } else {
        pendingFile = fileArg;
      }
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  electron.app.whenReady().then(() => {
    utils.electronApp.setAppUserModelId("com.nicmd");
    electron.app.on("browser-window-created", (_, window) => {
      utils.optimizer.watchWindowShortcuts(window);
    });
    registerIPC();
    createWindow();
    const fileArg = findFileArg(process.argv);
    if (fileArg) {
      pendingFile = fileArg;
    }
    electron.app.on("activate", () => {
      if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  electron.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      electron.app.quit();
    }
  });
}
function findFileArg(argv) {
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("-") && fs.existsSync(arg) && isMarkdownFile(arg)) {
      return arg;
    }
  }
  return null;
}
