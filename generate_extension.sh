#!/bin/bash

# Vérifier si Node.js et npm sont installés
if ! command -v node &> /dev/null; then
    echo "Erreur : Node.js n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "Erreur : npm n'est pas installé. Veuillez l'installer avant de continuer."
    exit 1
fi

# Installer les dépendances nécessaires
npm install

# Compiler l'extension
npm run compile

# Vérifier si vsce est installé
if ! command -v vsce &> /dev/null; then
    echo "vsce n'est pas installé. Installation en cours..."
    npm install -g vsce
fi

# Générer le fichier .vsix
vsce package

# Vérifier si le fichier .vsix a été généré
if [ $? -eq 0 ]; then
    echo "L'extension a été compilée et générée avec succès."
else
    echo "Une erreur s'est produite lors de la génération de l'extension."
    exit 1
fi
