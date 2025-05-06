# 🧠 recAIpe — Backend Server

Bienvenue dans le backend de **recAIpe**, une application web innovante pour rechercher, générer et partager des recettes de cuisine grâce à
l'intelligence artificielle.

Construit avec **Node.js**, **Express**, **TypeScript**, et **Supabase**, ce serveur fournit une API sécurisée et scalable pour gérer les
utilisateurs, les recettes et l'interaction avec l'IA.

---

## 🚀 Fonctionnalités

- 🔐 Authentification sécurisée (JWT + refresh token)
- 🍳 Gestion des recettes (CRUD)
- 🧠 Requêtes à DeepSeek pour la génération de recettes via IA
- 📊 Sauvegarde des recettes et des utilisateurs dans Supabase
- ✅ Typage strict des réponses `{ success, message, data }`

---

## 🧰 Stack technique

- **Node.js** + **Express**
- **TypeScript**
- **Supabase**
- **Vercel** pour le déploiement

---

## 🧪 Scripts utiles

```bash
npm run dev         # Démarre le serveur Express en mode dev
npm run lint        # Analyse statique du code avec ESLint
npm run lint:fix    # Corrige automatiquement les problèmes détectés
```

---

## 📁 Structure du projet

```
src/
├── config/          # Configuration de l'application
├── controllers/     # Logique métier pour chaque route
├── middlewares/     # Middlewares personnalisés
├── routes/          # Définition des routes Express
├── types/           # Définition des types TypeScript partagés
├── utils/           # Fonctions utilitaires
├── validators/      # Validation des données d'entrée
├── index.ts         # Point d'entrée de l'application
```

---

## 🙋‍ Contributeurs

- **Bastien Bussard**
- **Jérémie Favre**
- **Hugo Grandjean**
- **Noé Henchoz**
- **Luca Vial**

---

## 📄 Licence

Ce projet est réalisé dans un but pédagogique. Tous les droits sont réservés aux auteurs et à l’école (HEIA-FR, Fribourg, Suisse).
