import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let syncInterval: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension de synchronisation de snippets activée');

    let disposable = vscode.commands.registerCommand('extension.syncLocalSnippets', () => {
        syncSnippets();
    });

    context.subscriptions.push(disposable);

    // Démarrer la synchronisation périodique
    startPeriodicSync();
}

function startPeriodicSync() {
    const config = vscode.workspace.getConfiguration('localSnippetSync');
    const intervalMinutes = config.get('syncIntervalMinutes', 30);

    syncInterval = setInterval(syncSnippets, intervalMinutes * 60 * 1000);
}

async function syncSnippets() {
    const config = vscode.workspace.getConfiguration('localSnippetSync');
    const sourceFilePath = config.get('sourceFilePath', '');

    if (!sourceFilePath) {
        vscode.window.showErrorMessage('Chemin du fichier source non configuré');
        return;
    }

    console.log(`Tentative de lecture du fichier : ${path.resolve(sourceFilePath)}`);

    try {
        const stats = await fs.promises.stat(sourceFilePath);
        if (stats.isDirectory()) {
            vscode.window.showErrorMessage(`Le chemin spécifié est un répertoire, pas un fichier : ${sourceFilePath}`);
            console.log(`c'est bon, c'est un répertoire ! `);
            return;
        }

        if (!stats.isFile()) {
            vscode.window.showErrorMessage(`Le chemin spécifié n'est ni un fichier ni un répertoire : ${sourceFilePath}`);
            console.log(`Aie ! C'est un fichier ! `);
            return;
        }

        const sourceContent = await fs.promises.readFile(sourceFilePath, 'utf8');
        const snippets = JSON.parse(sourceContent);
        await importSnippets(snippets);
        vscode.window.showInformationMessage('Snippets synchronisés avec succès');
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(`Erreur lors de la synchronisation : ${error.message}`);
            console.error('Erreur détaillée:', error);
        } else {
            vscode.window.showErrorMessage(`Une erreur inattendue s'est produite lors de la synchronisation`);
        }
    }
}

async function importSnippets(snippets: Record<string, any>) {
    const snippetsPath = getUserSnippetsPath();
    console.log(`Contenu des snippets à importer :`, JSON.stringify(snippets, null, 2));

    for (const [language, languageSnippets] of Object.entries(snippets)) {
        const snippetFile = path.join(snippetsPath, `${language}.json`);
        console.log(`Importation des snippets pour ${language} dans : ${snippetFile}`);

        try {
            // Vérifier si le répertoire des snippets existe, sinon le créer
            await fs.promises.mkdir(path.dirname(snippetFile), { recursive: true });

            // Lire le fichier existant s'il existe
            let existingSnippets: Record<string, any> = {};
            try {
                const existingContent = await fs.promises.readFile(snippetFile, 'utf8');
                existingSnippets = JSON.parse(existingContent);
            } catch (error) {
                // Le fichier n'existe pas encore, on utilise un objet vide
            }

            // Fusionner les nouveaux snippets avec les existants
            const mergedSnippets = { ...existingSnippets, ...languageSnippets };

            // Écrire les snippets fusionnés dans le fichier
            await fs.promises.writeFile(snippetFile, JSON.stringify(mergedSnippets, null, 2));
            console.log(`Snippets importés avec succès pour : ${language}`);
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Erreur lors de l'importation des snippets pour ${language}: ${error.message}`);
            } else {
                console.error(`Une erreur inattendue s'est produite lors de l'importation des snippets pour ${language}`);
            }
        }
    }
}

function getUserSnippetsPath(): string {
    switch (process.platform) {
        case 'win32':
            return path.join(process.env.APPDATA || '', 'Code', 'User', 'snippets');
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'snippets');
        default: // Linux and other Unix-like systems
            return path.join(os.homedir(), '.config', 'Code', 'User', 'snippets');
    }
}

export function deactivate() {
    if (syncInterval) {
        clearInterval(syncInterval);
    }
}
