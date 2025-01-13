# Vérifier si Node.js et npm sont installés
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Erreur : Node.js n'est pas installé. Veuillez l'installer avant de continuer." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Erreur : npm n'est pas installé. Veuillez l'installer avant de continuer." -ForegroundColor Red
    exit 1
}

# Installer les dépendances nécessaires
Write-Host "Installation des dépendances..." -ForegroundColor Yellow
npm install

# Compiler l'extension
Write-Host "Compilation de l'extension..." -ForegroundColor Yellow
npm run compile

# Vérifier si vsce est installé
if (-not (Get-Command vsce -ErrorAction SilentlyContinue)) {
    Write-Host "vsce n'est pas installé. Installation en cours..." -ForegroundColor Yellow
    npm install -g vsce
}

# Générer le fichier .vsix
Write-Host "Génération du fichier .vsix..." -ForegroundColor Yellow
vsce package

# Vérifier si le fichier .vsix a été généré
if ($LASTEXITCODE -eq 0) {
    Write-Host "L'extension a été compilée et générée avec succès." -ForegroundColor Green
} else {
    Write-Host "Une erreur s'est produite lors de la génération de l'extension." -ForegroundColor Red
    exit 1
}
