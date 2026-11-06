# Git Workflow for Swarm Protocol: Survivor

## 📋 Branch Strategy

This project follows a **feature branch workflow** where each phase has its own dedicated branch:

```
main (production-ready)
├── phase/0-setup (✅ Merged)
├── phase/1-game-concept (🔲 Next)
├── phase/2-game-content (🔲 Pending)
├── phase/3-game-design (🔲 Pending)
├── phase/4-app-design (🔲 Pending)
├── phase/5-foundation (🔲 Pending)
├── phase/6-core-build (🔲 Pending)
├── phase/7-build-the-game (🔲 Pending)
├── phase/8-features-polish (🔲 Pending)
└── phase/9-test-deploy (🔲 Pending)
```

## 🔄 Workflow Process

### For Each Phase:

1. **Create Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b phase/<phase-number>-<phase-name>
   ```

2. **Do the Work**
   - Implement all features for the phase
   - Commit changes with descriptive messages
   - Push to remote: `git push -u origin phase/<phase-number>-<phase-name>`

3. **Merge into Main**
   ```bash
   git checkout main
   git pull origin main
   git merge phase/<phase-number>-<phase-name> --no-ff -m "Merge Phase X: <Phase Name> into main"
   git push origin main
   ```

4. **Clean Up (Optional)**
   ```bash
   git branch -d phase/<phase-number>-<phase-name>
   git push origin --delete phase/<phase-number>-<phase-name>
   ```

## 📝 Branch Naming Convention

| Phase | Branch Name | Status |
|-------|-------------|--------|
| 0 | `phase/0-setup` | ✅ Complete & Merged |
| 1 | `phase/1-game-concept` | 🔲 Next |
| 2 | `phase/2-game-content` | ⏳ Pending |
| 3 | `phase/3-game-design` | ⏳ Pending |
| 4 | `phase/4-app-design` | ⏳ Pending |
| 5 | `phase/5-foundation` | ⏳ Pending |
| 6 | `phase/6-core-build` | ⏳ Pending |
| 7 | `phase/7-build-the-game` | ⏳ Pending |
| 8 | `phase/8-features-polish` | ⏳ Pending |
| 9 | `phase/9-test-deploy` | ⏳ Pending |

## 🎯 Current Status

- **Main Branch**: Contains merged Phase 0 work
- **Phase 0 Branch**: `phase/0-setup` (merged, kept for reference)
- **Next Branch**: `phase/1-game-concept` (to be created)

## 📊 Git History

```
c9e5e90 Merge Phase 0: Setup into main
|\ 
| * ebeed64 Phase 0: Setup - Tech stack established and project initialized
|/ 
* b1238b9 Initial commit
```

## 🔧 Commands Quick Reference

### Create and switch to a new phase branch:
```bash
git checkout -b phase/1-game-concept
```

### Push new branch to remote:
```bash
git push -u origin phase/1-game-concept
```

### Merge phase branch into main:
```bash
git checkout main
git merge phase/1-game-concept --no-ff -m "Merge Phase 1: Game Concept into main"
git push origin main
```

### Delete local and remote branch (after merge):
```bash
git branch -d phase/1-game-concept
git push origin --delete phase/1-game-concept
```

## ✅ Best Practices

1. **Always pull latest main** before creating a new branch
2. **Use descriptive commit messages** that explain what was done
3. **Keep branches focused** - one phase per branch
4. **Merge with --no-ff** to preserve branch history
5. **Delete merged branches** to keep the repo clean (optional)
6. **Create Pull Requests** for review before merging (recommended)

## 📚 Phase Descriptions

| Phase | Title | Core Objective |
|-------|-------|----------------|
| 0 | Setup | Confirm concept & setup tech stack |
| 1 | Game Concept | Define high-level game identity |
| 2 | Game Content | Build seed dataset (29 entities) |
| 3 | Game Design | Lock core loop & wave logic |
| 4 | App Design | Wireframe views & features |
| 5 | Foundation | Database schema & Auth setup |
| 6 | Core Build | Web application & CRUD UI |
| 7 | Build the Game | 60 FPS HTML5 Canvas engine |
| 8 | Features & Polish | UX polish & error handling |
| 9 | Test & Deploy | E2E testing & production launch |

---

**Workflow Established** ✅

Each phase will follow this pattern: Branch → Work → Merge → Next Phase
