# 🔄 Monorepo Migration Steps

## Current Structure (Problematic)
```
SereneApps/
├── .git/                    ← Main repo
├── mobile/                  ← React Native app
├── SereneAI-Web/           
│   └── .git/               ← ❌ Nested git repo (problem!)
└── backend/                ← Express.js backend
```

## Target Structure (Clean Monorepo)
```
SereneApps/
├── .git/                    ← Single git repo
├── mobile/                  ← React Native app
├── web/                     ← React web app (renamed from SereneAI-Web)
├── backend/                 ← Express.js backend
└── docs/                    ← Shared documentation
```

## Migration Steps

### Step 1: Remove nested .git from SereneAI-Web
```bash
cd /Users/adrianhalim/SereneApps
rm -rf SereneAI-Web/.git
```

### Step 2: Rename SereneAI-Web to web (optional, cleaner naming)
```bash
mv SereneAI-Web web
```

### Step 3: Move web docs to main docs folder
```bash
# Merge web docs into main docs
cp -r web/docs/* docs/
rm -rf web/docs
```

### Step 4: Create root package.json for monorepo management
```bash
# Will be created in next step
```

### Step 5: Git add, commit, and push
```bash
git add .
git commit -m "chore: migrate to monorepo structure with mobile, web, and backend"
git push origin ADRIANHHALIM
```

## Benefits of Monorepo
✅ Single git history
✅ Easier dependency management
✅ Shared documentation
✅ Consistent versioning
✅ Simpler CI/CD
✅ Better code sharing between frontend/backend

