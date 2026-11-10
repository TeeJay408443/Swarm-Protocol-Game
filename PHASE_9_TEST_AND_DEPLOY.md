# Phase 9: Test & Deploy

## Overview

Phase 9 is the **final phase** of the 10-phase build plan for SWARM PROTOCOL: SURVIVOR. This phase focuses on **E2E testing, production build, Vercel deployment, and live URL verification** to ensure the game is production-ready and accessible to players worldwide.

## Phase Objectives

1. **Comprehensive Testing** - Verify all game systems work together
2. **Production Build** - Optimize and bundle the application
3. **Vercel Deployment** - Deploy to production with CI/CD
4. **Live URL Verification** - Test the deployed application
5. **Performance Monitoring** - Ensure 60 FPS and smooth gameplay

## Quote from Toby Fox

> "The strength of this 10-phase roadmap is that every single feature, database column, and UI component has a specific home. You can step through it methodically to build, test, and ship a top-tier web project without getting overwhelmed."

---

## 🎯 Core Deliverables

### 1. E2E Testing Framework
**Purpose:** Comprehensive end-to-end testing to ensure all game systems work correctly

#### Test Categories:

##### 🎮 Game Engine Tests
| Test | Description | Expected Result |
|------|-------------|-----------------|
| Canvas Rendering | Verify canvas renders at 60 FPS | 60 FPS achieved |
| Input Handling | Test WASD, mouse, touch controls | All inputs registered |
| Camera Follow | Test camera follows player smoothly | Camera follows correctly |
| Entity Spawning | Test enemy and coin spawning | Entities spawn correctly |
| Collision Detection | Test collisions between entities | Collisions detected |
| Projectile Movement | Test projectile physics | Projectiles move correctly |
| Wave System | Test wave progression | Waves progress correctly |
| XP System | Test XP gain and level-up | XP and level-up work |
| Score System | Test score calculation (S = 10t + 25c) | Score calculated correctly |

##### 🧪 Component Tests
| Test | Description | Expected Result |
|------|-------------|-----------------|
| Player Movement | Test player movement in all directions | Player moves correctly |
| Enemy AI | Test enemy movement patterns | Enemies follow patterns |
| Combat System | Test damage and health | Combat works correctly |
| Coin Collection | Test coin pickup | Coins collected correctly |
| HUD Display | Test HUD shows correct data | HUD displays correctly |
| Level-Up Modal | Test level-up selection | Modal works correctly |
| Pause Menu | Test pause functionality | Pause works correctly |
| Game Over | Test game over state | Game over works correctly |

##### 🖥️ UI Tests
| Test | Description | Expected Result |
|------|-------------|-----------------|
| Navigation | Test all view navigation | All views accessible |
| Codex Search | Test search and filter | Results correct |
| Armory CRUD | Test loadout create/read/update/delete | All operations work |
| Leaderboards | Test score display | Scores display correctly |
| Profile | Test user stats display | Stats display correctly |
| Toast Notifications | Test toast alerts | Toasts appear correctly |
| Empty States | Test empty state display | Empty states display |
| Audio Settings | Test audio controls | Audio works correctly |
| Accessibility | Test accessibility features | Accessibility works |

##### 🌐 Integration Tests
| Test | Description | Expected Result |
|------|-------------|-----------------|
| Database Connection | Test Supabase connection | Connection successful |
| Data Fetching | Test entity data fetching | Data fetched correctly |
| Authentication | Test user auth flow | Auth works correctly |
| Score Sync | Test score sync to database | Scores sync correctly |
| Loadout Sync | Test loadout sync to database | Loadouts sync correctly |

##### 📱 Responsive Tests
| Test | Description | Expected Result |
|------|-------------|-----------------|
| Desktop | Test on desktop (1920x1080) | Works correctly |
| Laptop | Test on laptop (1366x768) | Works correctly |
| Tablet | Test on tablet (768x1024) | Works correctly |
| Mobile | Test on mobile (375x667) | Works correctly |
| Portrait | Test mobile portrait | Works correctly |
| Landscape | Test mobile landscape | Works correctly |

---

### 2. Production Build Configuration
**Purpose:** Optimize the application for production deployment

#### Build Configuration (`vite.config.ts`):
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Build settings
  build: {
    // Output directory
    outDir: 'dist',
    
    // Minify
    minify: 'esbuild',
    
    // Source maps
    sourcemap: false,
    
    // Rollup options
    rollupOptions: {
      // Manual chunks for better caching
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        game: ['howler'],
        supabase: ['@supabase/supabase-js']
      }
    },
    
    // Target
    target: 'es2020',
    
    // Assets
    assetsDir: 'assets',
    assetsInlineLimit: 4096
  },
  
  // Server settings
  server: {
    port: 3000,
    host: true
  },
  
  // Preview settings
  preview: {
    port: 4173,
    host: true
  }
})
```

#### Environment Configuration (`.env.production`):
```env
# Supabase
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App
VITE_APP_NAME=Swarm Protocol: Survivor
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=production

# Analytics (optional)
VITE_ANALYTICS_ID=your-analytics-id
```

#### Package.json Scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "build:prod": "npm run build",
    "deploy": "npm run build && vercel --prod",
    "deploy:dev": "npm run build && vercel",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint src --ext ts,tsx",
    "lint:fix": "eslint src --ext ts,tsx --fix",
    "type-check": "tsc --noEmit"
  }
}
```

---

### 3. Vercel Deployment
**Purpose:** Deploy the application to Vercel for production

#### Deployment Steps:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Create vercel.json:**
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "dist/index.html"
       }
     ],
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://your-project-ref.supabase.co/rest/v1/:splat"
       }
     ],
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "X-Frame-Options",
             "value": "DENY"
           },
           {
             "key": "X-Content-Type-Options",
             "value": "nosniff"
           },
           {
             "key": "Referrer-Policy",
             "value": "strict-origin-when-cross-origin"
           }
         ]
       }
     ]
   }
   ```

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

5. **Deploy to Preview:**
   ```bash
   vercel
   ```

#### Vercel Project Settings:
- **Name:** SWARM PROTOCOL: SURVIVOR
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`
- **Environment Variables:** Add Supabase URL and Anon Key
- **Git Integration:** Connect to GitHub repository
- **Auto Deploy:** Enable for main branch

---

### 4. Live URL Verification
**Purpose:** Verify the deployed application works correctly

#### Verification Checklist:

##### ✅ Basic Functionality
- [ ] Application loads without errors
- [ ] All views are accessible
- [ ] Navigation works correctly
- [ ] Game starts and runs
- [ ] Controls work (WASD, mouse, touch)
- [ ] Enemies spawn and move
- [ ] Player can shoot and hit enemies
- [ ] Coins can be collected
- [ ] XP and level-up work
- [ ] Score is calculated correctly (S = 10t + 25c)
- [ ] Wave system works
- [ ] Game over screen appears
- [ ] Pause menu works

##### ✅ Database Integration
- [ ] Supabase connection successful
- [ ] Entity data loads correctly
- [ ] Loadouts can be created, read, updated, deleted
- [ ] Scores are saved to database
- [ ] Leaderboards display correctly
- [ ] User authentication works
- [ ] Profile data loads correctly

##### ✅ UI/UX
- [ ] Toast notifications appear
- [ ] Input validation works
- [ ] Empty states display correctly
- [ ] Audio settings work
- [ ] Accessibility features work
- [ ] Responsive design works on all devices

##### ✅ Performance
- [ ] Application loads in < 3 seconds
- [ ] Game runs at 60 FPS
- [ ] No memory leaks
- [ ] No console errors
- [ ] Bundle size < 5MB
- [ ] First contentful paint < 1 second

##### ✅ Security
- [ ] HTTPS enforced
- [ ] No XSS vulnerabilities
- [ ] No SQL injection vulnerabilities
- [ ] Environment variables not exposed
- [ ] CORS configured correctly
- [ ] Security headers present

---

### 5. Performance Monitoring
**Purpose:** Monitor and optimize application performance

#### Performance Metrics:
| Metric | Target | Measurement |
|--------|--------|-------------|
| FPS | 60 | requestAnimationFrame monitoring |
| Frame Time | < 16.67ms | Performance.now() |
| Memory Usage | < 200MB | Performance.memory |
| Bundle Size | < 5MB | Build output |
| Load Time | < 3s | Lighthouse |
| First Paint | < 1s | Lighthouse |
| Largest Contentful Paint | < 2.5s | Lighthouse |
| Time to Interactive | < 3.8s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |

#### Performance Optimization:

1. **Code Splitting:**
   ```typescript
   // Lazy load game components
   const GameContainer = React.lazy(() => import('./GameContainer'))
   ```

2. **Image Optimization:**
   ```typescript
   // Use next-gen formats
   import heroImage from './hero.webp'
   ```

3. **Font Optimization:**
   ```css
   /* Preload fonts */
   @font-face {
     font-family: 'Inter';
     font-display: swap;
   }
   ```

4. **Asset Optimization:**
   - Compress audio files
   - Use WebP for images
   - Minify CSS and JS
   - Tree-shake unused code

---

## 📁 File Structure

```
SWARM-PROTOCOL-GAME/
├── PHASE_9_TEST_AND_DEPLOY.md          # This file
├── vercel.json                         # Vercel configuration
├── .env.production                     # Production environment
├── vite.config.ts                      # Updated build config
├── package.json                        # Updated scripts
├── 
├── tests/
│   ├── e2e/                            # E2E tests
│   │   ├── game.spec.ts                # Game engine tests
│   │   ├── ui.spec.ts                  # UI tests
│   │   ├── integration.spec.ts         # Integration tests
│   │   └── responsive.spec.ts          # Responsive tests
│   ├── unit/                           # Unit tests
│   │   └── ...
│   └── fixtures/                       # Test data
│
├── playwright.config.ts                # Playwright config
├── vitest.config.ts                    # Vitest config
└── ...
```

---

## 🧪 Testing Setup

### Playwright Configuration:
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
  ],
})
```

### Vitest Configuration:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/']
    }
  }
})
```

---

## 📊 Success Criteria

Phase 9 is complete when:

1. ✅ All E2E tests pass
2. ✅ Production build completes without errors
3. ✅ Application deployed to Vercel
4. ✅ Live URL is accessible and working
5. ✅ Performance metrics meet targets
6. ✅ Security checks pass
7. ✅ Code coverage > 80%
8. ✅ PR is created and merged into main

---

## 🎯 Deployment Checklist

### Pre-Deployment:
- [ ] Install Vercel CLI
- [ ] Configure vercel.json
- [ ] Set up environment variables
- [ ] Configure build settings
- [ ] Set up Git integration
- [ ] Configure auto-deploy
- [ ] Set up custom domain (optional)
- [ ] Configure analytics (optional)

### Deployment:
- [ ] Run `vercel --prod`
- [ ] Verify deployment logs
- [ ] Check build output
- [ ] Verify deployment URL

### Post-Deployment:
- [ ] Test all game systems
- [ ] Test database integration
- [ ] Test UI/UX
- [ ] Test performance
- [ ] Test security
- [ ] Monitor for errors
- [ ] Gather feedback

---

## 🚀 Next Steps

After completing Phase 9:
1. **Celebrate!** - The game is live and production-ready
2. **Gather Feedback** - Collect user feedback and analytics
3. **Plan Updates** - Identify areas for improvement
4. **Maintenance** - Set up monitoring and error tracking
5. **Marketing** - Promote the game to players

---

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Vitest Documentation](https://vitest.dev/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/overview/)
- [Web Vitals](https://web.dev/vitals/)
- [Core Web Vitals](https://web.dev/vitals/)

---

## 💡 Tips

1. **Test Early, Test Often:** Run tests after every major change
2. **Monitor Performance:** Use Lighthouse and Web Vitals
3. **Optimize Assets:** Compress images and audio files
4. **Cache Strategically:** Use caching for static assets
5. **Minimize Dependencies:** Remove unused dependencies
6. **Tree-Shake:** Ensure unused code is removed
7. **Lazy Load:** Load components only when needed
8. **CDN:** Use a CDN for static assets
9. **Security:** Always use HTTPS and security headers
10. **Monitor:** Set up error tracking and monitoring

---

## 🎉 Conclusion

Phase 9 is the final step in the 10-phase build plan. By the end of this phase, SWARM PROTOCOL: SURVIVOR will be a production-ready, fully-featured, 2D top-down arena horde survival game that players can enjoy on any device.

**"Ship it!"** 🚀
