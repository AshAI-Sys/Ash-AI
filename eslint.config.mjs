export default [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'public/**',
      'src/**/*.d.ts',
      'scripts/**/*.js', // Allow console in scripts
      'src/**/*.ts',      // Skip TypeScript files for now
      'src/**/*.tsx'      // Skip TypeScript files for now
    ]
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'warn'
    }
  },
  {
    files: ['scripts/**/*.js', 'next.config.js'],
    rules: {
      'no-console': 'off', // Allow console in scripts and config
      'no-unused-vars': 'off' // Allow unused vars in config files
    }
  }
]