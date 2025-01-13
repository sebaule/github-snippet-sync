#!/bin/bash

EXTENSION_NAME="github-snippet-sync-0.0.1.vsix"

# Vérifier si le fichier .vsix existe
if [ ! -f "$EXTENSION_NAME" ]; then
    echo "Erreur : Le fichier $EXTENSION_NAME n'existe pas dans le répertoire courant."
    exit 1
fi

# Vérifier si VS Code est installé
if ! command -v code &> /dev/null; then
    echo "Erreur : VS Code n'est pas installé ou n'est pas dans le PATH."
    exit 1
fi

# Installer l'extension
echo "Installation de l'extension $EXTENSION_NAME..."
code --install-extension "$EXTENSION_NAME"

# Vérifier si l'installation a réussi
if [ $? -eq 0 ]; then
    echo "L'extension a été installée avec succès."
else
    echo "Une erreur s'est produite lors de l'installation de l'extension."
    exit 1
fi
