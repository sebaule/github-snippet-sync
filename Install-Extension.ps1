$EXTENSION_NAME = "github-snippet-sync-0.0.2.vsix"

# Vérifier si le fichier .vsix existe
if (-not (Test-Path $EXTENSION_NAME)) {
    Write-Host "Erreur : Le fichier $EXTENSION_NAME n'existe pas dans le répertoire courant." -ForegroundColor Red
    exit 1
}

# Vérifier si VS Code est installé
$vsCodePath = (Get-Command code -ErrorAction SilentlyContinue).Source
if (-not $vsCodePath) {
    Write-Host "Erreur : VS Code n'est pas installé ou n'est pas dans le PATH." -ForegroundColor Red
    exit 1
}

# Installer l'extension
Write-Host "Installation de l'extension $EXTENSION_NAME..." -ForegroundColor Yellow
$result = & $vsCodePath --install-extension $EXTENSION_NAME 2>&1

# Vérifier si l'installation a réussi
if ($LASTEXITCODE -eq 0) {
    Write-Host "L'extension a été installée avec succès." -ForegroundColor Green
} else {
    Write-Host "Une erreur s'est produite lors de l'installation de l'extension." -ForegroundColor Red
    Write-Host $result
    exit 1
}
