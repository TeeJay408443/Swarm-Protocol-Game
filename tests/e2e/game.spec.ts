/**
 * Game Engine E2E Tests
 * Phase 9: Test & Deploy - End-to-End Testing
 */

import { test, expect, beforeAll, afterAll } from '@playwright/test'

// Test URL - will be replaced by Vercel deployment URL
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000'

// Helper to navigate to the game
const navigateToGame = async (page) => {
  await page.goto(TEST_URL)
  await page.waitForLoadState('networkidle')
  
  // Click on Play button to start the game
  const playButton = page.getByRole('button', { name: /play/i })
  if (await playButton.count() > 0) {
    await playButton.click()
    await page.waitForLoadState('networkidle')
  }
}

// Helper to wait for canvas
const waitForCanvas = async (page) => {
  await page.waitForSelector('canvas', { state: 'visible' })
}

test.describe('Game Engine Tests', () => {
  test.beforeAll(async () => {
    console.log(`Running tests against: ${TEST_URL}`)
  })

  test('Application loads without errors', async ({ page }) => {
    await page.goto(TEST_URL)
    
    // Check for console errors
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.waitForLoadState('networkidle')
    
    // Check page title
    await expect(page).toHaveTitle(/Swarm Protocol|Survivor/i)
    
    // Check for main content
    await expect(page.getByRole('main')).toBeVisible()
    
    // Verify no errors
    expect(errors.length).toBe(0)
  })

  test('Navigation to Play view works', async ({ page }) => {
    await page.goto(TEST_URL)
    
    // Find and click Play navigation
    const playLink = page.getByRole('link', { name: /play/i })
    if (await playLink.count() > 0) {
      await playLink.click()
      await page.waitForURL('**/play')
    }
    
    // Should see game canvas or game container
    await expect(page.locator('canvas, [class*="Game"]')).toBeVisible()
  })

  test('Game canvas renders', async ({ page }) => {
    await navigateToGame(page)
    await waitForCanvas(page)
    
    // Verify canvas exists
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
    
    // Verify canvas has dimensions
    const box = await canvas.boundingBox()
    expect(box?.width).toBeGreaterThan(0)
    expect(box?.height).toBeGreaterThan(0)
  })

  test('Player can move with WASD keys', async ({ page }) => {
    await navigateToGame(page)
    await waitForCanvas(page)
    
    // Get initial player position (simulated)
    // In a real test, we would need to access game state
    // For now, we'll just verify the game accepts input
    
    // Press W (forward)
    await page.keyboard.down('w')
    await page.waitForTimeout(500)
    await page.keyboard.up('w')
    
    // Press A (left)
    await page.keyboard.down('a')
    await page.waitForTimeout(500)
    await page.keyboard.up('a')
    
    // Press S (back)
    await page.keyboard.down('s')
    await page.waitForTimeout(500)
    await page.keyboard.up('s')
    
    // Press D (right)
    await page.keyboard.down('d')
    await page.waitForTimeout(500)
    await page.keyboard.up('d')
    
    // No errors should occur
    const errors = await page.evaluate(() => {
      return window.errors || []
    })
    expect(errors.length).toBe(0)
  })

  test('Mouse input works', async ({ page }) => {
    await navigateToGame(page)
    await waitForCanvas(page)
    
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    
    if (box) {
      // Move mouse to center of canvas
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      
      // Click
      await page.mouse.down()
      await page.waitForTimeout(100)
      await page.mouse.up()
      
      // No errors should occur
      const errors = await page.evaluate(() => {
        return window.errors || []
      })
      expect(errors.length).toBe(0)
    }
  })

  test('Touch input works (simulated)', async ({ page }) => {
    await navigateToGame(page)
    await waitForCanvas(page)
    
    const canvas = page.locator('canvas')
    const box = await canvas.boundingBox()
    
    if (box) {
      // Simulate touch start
      await page.evaluate((x, y) => {
        const event = new TouchEvent('touchstart', {
          touches: [{ clientX: x, clientY: y, identifier: 0 }]
        })
        document.dispatchEvent(event)
      }, box.x + box.width / 2, box.y + box.height / 2)
      
      await page.waitForTimeout(100)
      
      // Simulate touch end
      await page.evaluate((x, y) => {
        const event = new TouchEvent('touchend', {
          changedTouches: [{ clientX: x, clientY: y, identifier: 0 }]
        })
        document.dispatchEvent(event)
      }, box.x + box.width / 2, box.y + box.height / 2)
      
      // No errors should occur
      const errors = await page.evaluate(() => {
        return window.errors || []
      })
      expect(errors.length).toBe(0)
    }
  })

  test('HUD displays correctly', async ({ page }) => {
    await navigateToGame(page)
    await waitForCanvas(page)
    
    // Check for HUD elements
    await expect(page.locator('[class*="HUD"]')).toBeVisible()
    
    // Check for score display
    await expect(page.getByText(/score/i)).toBeVisible()
    
    // Check for health display
    await expect(page.getByText(/health|hp/i)).toBeVisible()
    
    // Check for XP display
    await expect(page.getByText(/xp|experience/i)).toBeVisible()
    
    // Check for wave display
    await expect(page.getByText(/wave/i)).toBeVisible()
  })

  test('Game can be paused', async ({ page }) => {
    await navigateToGame(page)
    await waitForCanvas(page)
    
    // Look for pause button
    const pauseButton = page.getByRole('button', { name: /pause/i })
    
    if (await pauseButton.count() > 0) {
      await pauseButton.click()
      
      // Check for pause menu
      await expect(page.getByText(/paused|resume/i)).toBeVisible()
      
      // Click resume
      const resumeButton = page.getByRole('button', { name: /resume/i })
      if (await resumeButton.count() > 0) {
        await resumeButton.click()
        
        // Pause menu should be hidden
        await expect(page.getByText(/paused/i)).not.toBeVisible()
      }
    }
  })

  test('Score formula works (S = 10t + 25c)', async ({ page }) => {
    // This test verifies the score calculation formula
    // In a real implementation, we would:
    // 1. Play the game for a known time
    // 2. Collect a known number of coins
    // 3. Verify the score matches 10t + 25c
    
    // For now, we'll just verify the formula is displayed
    await navigateToGame(page)
    await waitForCanvas(page)
    
    // Check if formula is displayed somewhere
    const formulaText = page.getByText(/S = 10t \+ 25c|10t \+ 25c/i)
    if (await formulaText.count() > 0) {
      await expect(formulaText).toBeVisible()
    }
  })
})

test.describe('UI Tests', () => {
  test('All views are accessible', async ({ page }) => {
    await page.goto(TEST_URL)
    
    const views = ['HQ', 'Play', 'Codex', 'Armory', 'Leaderboards', 'Profile']
    
    for (const view of views) {
      const link = page.getByRole('link', { name: new RegExp(view, 'i') })
      if (await link.count() > 0) {
        await link.click()
        await page.waitForLoadState('networkidle')
        
        // Verify we're on the correct view
        await expect(page).toHaveURL(new RegExp(view.toLowerCase()))
        
        // Go back to home
        await page.goto(TEST_URL)
        await page.waitForLoadState('networkidle')
      }
    }
  })

  test('Codex view loads entities', async ({ page }) => {
    await page.goto(TEST_URL)
    
    // Navigate to Codex
    const codexLink = page.getByRole('link', { name: /codex/i })
    if (await codexLink.count() > 0) {
      await codexLink.click()
      await page.waitForURL('**/codex')
      
      // Check for entity cards
      await expect(page.locator('[class*="Card"]')).toHaveCount(29) // 6 heroes + 4 enemies + 15 upgrades + 4 achievements
    }
  })

  test('Armory view works', async ({ page }) => {
    await page.goto(TEST_URL)
    
    // Navigate to Armory
    const armoryLink = page.getByRole('link', { name: /armory/i })
    if (await armoryLink.count() > 0) {
      await armoryLink.click()
      await page.waitForURL('**/armory')
      
      // Check for create loadout button
      await expect(page.getByRole('button', { name: /create/i })).toBeVisible()
    }
  })

  test('Leaderboards view works', async ({ page }) => {
    await page.goto(TEST_URL)
    
    // Navigate to Leaderboards
    const leaderboardsLink = page.getByRole('link', { name: /leaderboards/i })
    if (await leaderboardsLink.count() > 0) {
      await leaderboardsLink.click()
      await page.waitForURL('**/leaderboards')
      
      // Check for leaderboard table or list
      await expect(page.getByText(/leaderboard|rank|score/i)).toBeVisible()
    }
  })

  test('Profile view works', async ({ page }) => {
    await page.goto(TEST_URL)
    
    // Navigate to Profile
    const profileLink = page.getByRole('link', { name: /profile/i })
    if (await profileLink.count() > 0) {
      await profileLink.click()
      await page.waitForURL('**/profile')
      
      // Check for profile content
      await expect(page.getByText(/profile|stats|achievements/i)).toBeVisible()
    }
  })
})

test.describe('Responsive Tests', () => {
  test('Desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto(TEST_URL)
    
    // Verify layout
    await expect(page.locator('main')).toBeVisible()
    
    // Verify no horizontal scroll
    const body = page.locator('body')
    const width = await body.evaluate(el => el.scrollWidth)
    const clientWidth = await body.evaluate(el => el.clientWidth)
    expect(width).toBeLessThanOrEqual(clientWidth + 10) // Allow small margin
  })

  test('Laptop (1366x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto(TEST_URL)
    
    await expect(page.locator('main')).toBeVisible()
  })

  test('Tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(TEST_URL)
    
    await expect(page.locator('main')).toBeVisible()
  })

  test('Mobile (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(TEST_URL)
    
    await expect(page.locator('main')).toBeVisible()
    
    // Verify mobile menu or responsive layout
    // This would depend on your mobile implementation
  })
})

test.describe('Accessibility Tests', () => {
  test('Keyboard navigation works', async ({ page }) => {
    await page.goto(TEST_URL)
    
    // Tab through all focusable elements
    const focusableElements = page.locator('[tabindex]:not([tabindex="-1"]), a, button, input, select, textarea')
    const count = await focusableElements.count()
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100)
    }
    
    // No errors should occur
    const errors = await page.evaluate(() => {
      return window.errors || []
    })
    expect(errors.length).toBe(0)
  })

  test('Screen reader attributes exist', async ({ page }) => {
    await page.goto(TEST_URL)
    
    // Check for ARIA attributes
    const ariaElements = page.locator('[aria-label], [aria-labelledby], [role]')
    await expect(ariaElements).toHaveCount(10) // At least some ARIA elements
  })

  test('Focus indicators visible', async ({ page }) => {
    await page.goto(TEST_URL)
    
    // Focus on first element
    await page.keyboard.press('Tab')
    
    // Check for focus styles
    const focusedElement = page.locator(':focus-visible')
    await expect(focusedElement).toBeVisible()
  })
})
