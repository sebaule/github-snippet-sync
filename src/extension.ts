import * as vscode from 'vscode';
import * as https from 'https';
import * as path from 'path';
import * as os from 'os';

export function activate(context: vscode.ExtensionContext) {
    console.log('L\'extension GitHub Snippet Sync est maintenant active');
    vscode.window.showInformationMessage('L\'extension GitHub Snippet Sync est maintenant active');

    console.log(`Chemin complet des snippets VS Code : ${getUserSnippetsPath()}`);

    let disposable = vscode.commands.registerCommand('extension.syncGitHubSnippets', async () => {
        const config = vscode.workspace.getConfiguration('githubSnippetSync');
        let repository = config.get('repositoryUrl') as string;
        let snippetsFolder = config.get('snippetsFolder') as string;
        let branch = config.get('branch') as string;
        let authMethod = config.get('authMethod') as string;

        if (!repository || !snippetsFolder || !branch) {
            repository = await vscode.window.showInputBox({ prompt: 'Entrez l\'URL du dépôt GitHub' }) || '';
            snippetsFolder = await vscode.window.showInputBox({ prompt: 'Entrez le dossier des snippets (par défaut: snippets)', value: 'snippets' }) || 'snippets';
            branch = await vscode.window.showInputBox({ prompt: 'Entrez la branche (par défaut: main)', value: 'main' }) || 'main';

            await config.update('repositoryUrl', repository, vscode.ConfigurationTarget.Global);
            await config.update('snippetsFolder', snippetsFolder, vscode.ConfigurationTarget.Global);
            await config.update('branch', branch, vscode.ConfigurationTarget.Global);
        }

        if (!authMethod) {
            authMethod = await vscode.window.showQuickPick(['token', 'password'], { placeHolder: 'Choisissez la méthode d\'authentification' }) || 'token';
            await config.update('authMethod', authMethod, vscode.ConfigurationTarget.Global);
        }

        let token = '';
        let username = '';
        let password = '';

        if (authMethod === 'token') {
            token = config.get('token') as string;
            if (!token) {
                token = await vscode.window.showInputBox({ prompt: 'Entrez votre token d\'accès personnel GitHub', password: true }) || '';
                await config.update('token', token, vscode.ConfigurationTarget.Global);
            }
        } else {
            username = config.get('username') as string;
            password = config.get('password') as string;
            if (!username || !password) {
                username = await vscode.window.showInputBox({ prompt: 'Entrez votre nom d\'utilisateur GitHub' }) || '';
                password = await vscode.window.showInputBox({ prompt: 'Entrez votre mot de passe GitHub', password: true }) || '';
                await config.update('username', username, vscode.ConfigurationTarget.Global);
                await config.update('password', password, vscode.ConfigurationTarget.Global);
            }
        }

        try {
            await syncSnippets(repository, snippetsFolder, branch, authMethod, token, username, password);
            vscode.window.showInformationMessage('Snippets synchronisés avec succès !');
        } catch (error: unknown) {
            console.error('Erreur détaillée :', error);
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Erreur lors de la synchronisation des snippets : ${error.message}`);
            } else {
                vscode.window.showErrorMessage(`Une erreur inattendue s'est produite lors de la synchronisation des snippets.`);
            }
        }
    });

    context.subscriptions.push(disposable);
}

async function syncSnippets(repository: string, snippetsFolder: string, branch: string, authMethod: string, token: string, username: string, password: string) {
    console.log('Début de la synchronisation des snippets');

    const [owner, repo] = repository.split('/').slice(-2);
    const snippetsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${snippetsFolder}?ref=${branch}`;
    console.log(`URL de l'API GitHub : ${snippetsUrl}`);

    const response = authMethod === 'token' ? await fetchGitHubContents(snippetsUrl, token) : await fetchGitHubContentsWithPassword(snippetsUrl, username, password);
    
    console.log('Réponse de l\'API GitHub :', JSON.stringify(response, null, 2));

    if (response.message === "Not Found") {
        throw new Error(`Le dépôt ou le dossier spécifié n'existe pas. Vérifiez l'URL et vos permissions.`);
    }

    const files = Array.isArray(response) ? response : [response];

    if (!files || files.length === 0) {
        console.log('Aucun fichier trouvé dans le répertoire spécifié');
        throw new Error('Aucun fichier trouvé dans le répertoire spécifié');
    }

    console.log(`Nombre de fichiers trouvés : ${files.length}`);

    for (const file of files) {
        if (file.type === 'file' && file.name.endsWith('.json')) {
            console.log(`Traitement du fichier : ${file.name}`);
            const content = await fetchGitHubFile(file.download_url, authMethod, token, username, password);
            console.log(`Contenu du fichier ${file.name} :`, content);
            const snippets = JSON.parse(content);
            await importSnippets(file.name, snippets);
        }
    }
}

function fetchGitHubContents(url: string, token: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'VS Code GitHub Snippet Sync',
                'Authorization': `token ${token}`
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('Données récupérées depuis GitHub :', data);
                resolve(JSON.parse(data));
            });
        }).on('error', reject);
    });
}

function fetchGitHubContentsWithPassword(url: string, username: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'VS Code GitHub Snippet Sync',
                'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('Données récupérées depuis GitHub :', data);
                resolve(JSON.parse(data));
            });
        }).on('error', reject);
    });
}

function fetchGitHubFile(url: string, authMethod: string, token: string, username: string, password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'VS Code GitHub Snippet Sync',
                ...(authMethod === 'token' ? { 'Authorization': `token ${token}` } : { 'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64') })
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function importSnippets(fileName: string, snippets: any) {
    const snippetFile = path.join(getUserSnippetsPath(), fileName);
    console.log(`Chemin du fichier de snippets : ${snippetFile}`);
    console.log(`Contenu des snippets à importer :`, JSON.stringify(snippets, null, 2));

    try {
        await vscode.workspace.fs.writeFile(vscode.Uri.file(snippetFile), Buffer.from(JSON.stringify(snippets, null, 2)));
        console.log(`Snippets importés avec succès : ${fileName}`);
    } catch (error) {
        console.error(`Erreur lors de l'importation des snippets ${fileName}:`, error);
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

export function deactivate() {}
