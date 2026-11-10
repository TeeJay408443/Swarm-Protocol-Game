/**
 * Vitest Configuration
 * Phase 9: Test & Deploy - Unit Testing Setup
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  // Test configuration
  test: {
    // Environment
    environment: 'jsdom',
    
    // Globals
    globals: true,
    
    // Setup files
    setupFiles: ['./tests/setup.ts'],
    
    // CSS
    css: true,
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    },
    
    // Timeout
    testTimeout: 10000,
    
    // Hook timeout
    hookTimeout: 10000,
    
    // Output
    outputFile: 'test-results.xml',
    
    // Watch mode
    watch: false
  },
  
  // Resolve
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@game': path.resolve(__dirname, './src/game'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@types': path.resolve(__dirname, './src/types'),
      '@context': path.resolve(__dirname, './src/context'),
      '@db': path.resolve(__dirname, './src/db')
    }
  }
})
