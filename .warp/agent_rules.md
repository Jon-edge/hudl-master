# AI Agent Rules for hudl-master Project

## Code Style & Preferences

### TypeScript/React
- Use function components with hooks, not class components
- Prefer `const` over `let` when possible
- Use explicit return types for functions when not obvious
- Use meaningful variable names that describe intent
- Prefer early returns to reduce nesting

### File Organization
- Keep components in `/src/components/`
- Keep hooks in `/src/hooks/`
- Keep utilities in `/src/utils/`
- Use barrel exports (index.ts files) for clean imports

## Project-Specific Context

### This is a Plinko Game Project
- Main component is `Plinko.tsx` using Matter.js physics engine
- Game state management uses refs for performance-critical state
- `useAsyncEffect` hook manages physics engine lifecycle
- Configuration is managed through `PlinkoConfig` interface

### Common Tasks
- When debugging physics issues, check the Matter.js event handlers
- When modifying game state, be careful about timing and race conditions
- Settings changes should properly restart the game when needed
- Always preserve balls when the game completes (win condition met)

## Response Style
- Be direct and action-oriented
- Don't ask for confirmation on obvious tasks
- Explain WHY when making significant changes
- Point out potential side effects of changes
- When debugging, start with the most likely culprits

## Tools & Commands
- Use `npm run dev` to start development server
- Use `npm run build` to build for production
- Prefer using the file reading tools over `cat` commands
- Use git commands with `--no-pager` flag to avoid pagination issues

## Auto-Execute Commands (No Confirmation Needed)
- `git status` when checking project state
- `npm run lint` after code changes
- `git diff --no-pager` when reviewing changes
- `ls -la` when exploring directories
- `npm run dev` when asked to start development
- File reading/searching commands for debugging
- Non-destructive git commands (log, show, diff)

## Auto-Edit Files (No Confirmation Needed)
- Bug fixes when the issue and solution are clear
- Adding imports or exports
- Updating configuration files (package.json, tsconfig.json, etc.)
- Code refactoring when explicitly requested
- Adding new components or utilities when specifications are clear
- Fixing TypeScript errors or linting issues
- Adding documentation or comments when requested

## Commands That ALWAYS Need Confirmation
- `git push`
- `rm` or destructive file operations
- `npm install` or package changes
- Production deployments
- Database operations
