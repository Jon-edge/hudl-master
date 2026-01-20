---
name: plinko-deep-ux-overhaul
overview: A comprehensive UI/UX overhaul replacing the debug renderer with a custom graphical engine, adding sensory feedback (sound/particles), and restructuring the layout for responsiveness and better player management.
todos:
  - id: scaffold
    content: Create PlinkoGame component folder structure and move existing logic
    status: in_progress
  - id: custom-renderer
    content: Implement Custom Canvas Renderer (replacing Matter.Render)
    status: pending
    dependencies:
      - scaffold
  - id: particles
    content: Implement Particle System & Visual Effects
    status: pending
    dependencies:
      - custom-renderer
  - id: sound
    content: Add Sound Effects System
    status: pending
    dependencies:
      - scaffold
  - id: layout
    content: Refactor Layout for Mobile Responsiveness
    status: pending
    dependencies:
      - custom-renderer
  - id: player-mgmt
    content: Enhance Player Management UI
    status: pending
    dependencies:
      - layout
---

# Plinko Deep UX Overhaul Plan

This plan goes beyond theming to fundamentally improve how the game feels and functions.

## 1. Core Experience: Custom Rendering Engine

We will **retain the Matter.js Physics Engine** for simulation but replace the default `Matter.Render` (which is intended for debugging) with a custom `requestAnimationFrame` loop drawing to the Canvas.

-   **Visual Style:** "Modern Glass & Light". Clean lines, soft shadows, subtle gradients.
-   **Dynamic Balls:** Balls will have a visual "material" (glass/metallic) and trail effects.
-   **Active Pins:** Pins will pulse or light up briefly when hit.
-   **Bucket Visuals:** Buckets will be clearly defined "zones" with glowing indicators when a ball enters.
-   **Particle System:** Simple particle explosions on key events (bucket entry, win condition).

## 2. Sensory Feedback (The "Juice")

-   **Sound Effects:** Implement a `useSound` hook (using standard HTML5 Audio) for:
    -   *Collision:* Soft "tick" or "clink" varying by velocity.
    -   *Bucket:* "Ding" or positive chord.
    -   *Win:* Celebration fanfare.
-   **Haptic/Visual Feedback:** Screen shake (subtle) for winning moments.

## 3. UI/UX Architecture & Layout

Refactor the monolithic `Plinko.tsx` into:

-   `PlinkoGame`: Handles Matter.js physics and the custom rendering loop.
-   `PlinkoHUD`: Overlay for scores, round status, and "Round Winner" announcements.
-   `PlinkoControls`: A responsive control bar (bottom on mobile, side on desktop).
-   `PlayerManager`: A dedicated, enhanced modal for roster management.
-   `PlayerSidebar`: A persistent, alphabetized roster list.

### Responsive Layout Strategy

-   **Desktop:** Three-pane (Players | Board | Leaderboard/Config).
-   **Mobile:** Vertical stack. Players/Config move to Drawers/Modals. The Board takes maximum screen real estate.

## 4. Enhanced Player Management

-   **Roster Sidebar:**
    -   Vertical, scrollable column.
    -   **Sorting:** Automatically alphabetized by name.
    -   **List Item Design:** Avatar (left) + Name + Toggle Switch.
    -   **Quick Search:** Filter player list by name.
-   **Leaderboard:**
    -   **Simplification:** Remove "Overall Winner" text/badges. The ordering (top of list) is sufficient.
    -   **Focus:** Clean, tabular design focusing on the *active* round winner (if any) vs historical data.
-   **Player Manager Modal:**
    -   **Layout:** Refined List View (not grid).
    -   **List Item Design:**
        -   **Left:** Large Avatar (circular) + Name (bold).
        -   **Right:** Action cluster: "Edit Name" (pencil icon), "Upload Photo" (camera icon), "Wins" (+/- stepper), "Archive" (trash/archive icon).
        -   **Hover State:** Subtle background highlight to indicate interactivity.
    -   **Bulk Actions:** "Select All", "Clear Wins".
    -   **Upload:** Standard file picker triggered by the camera icon.

## 5. UI Polish & Controls

-   **Control Bar (Bottom/Side):**
    -   Replace generic `Button`s with icon-enhanced, labeled controls.
    -   **Start/Stop:** Large, primary action button. "Play" / "Pause" icons.
    -   **Config:** Gear icon button (Toggles Right Sidebar Mode).
    -   **Sound:** Toggle mute/unmute icon.
-   **Right Sidebar Logic (Mode Switch):**
    -   **Modes:** Toggles between "Leaderboard" (default) and "Config Panel".
    -   **Interaction:** Clicking the "Config" gear button switches the right sidebar content in-place.
    -   **Config Panel Design:**
        -   Fills the full available width/height of the sidebar.
        -   Uses **Accordion/Collapsible** sections (shadcn/ui) for grouping settings.
        -   Uses `ScrollArea` (shadcn/ui) for vertical scrolling.
        -   Uses `Slider`, `Switch`, `Input` (shadcn/ui) for controls.
-   **Game Centering:**
    -   The `PlinkoGame` component remains centered in the middle pane, regardless of which sidebar mode is active.
-   **Typography & Spacing:** Increase padding in modal lists for touch targets. Use consistent font weights for names vs stats.

## 6. Win Celebration: Physics Overlay

Instead of generic confetti, we will implement a dedicated "Physics Celebration Mode":

-   **Overlay:** A full-screen or board-covering overlay appears when a winner is decided.
-   **Content:** The Winner's Avatar and Name appear large in the center.
-   **Physics Interaction:**
    -   The Avatar/Name text act as static physics bodies (obstacles).
    -   A continuous stream of balls falls from the top.
    -   Balls bounce off the winner's name/avatar, creating a dynamic, playful interaction.

## 7. Technical Implementation Steps

### Phase 1: Layout & Core UI (Functional Overhaul)

1.  **Global Theme Update:** Update `globals.css` and Tailwind config to support the "Modern Glass" aesthetic (colors, radius, backdrop-blurs).
2.  **Generic Game Shell:** Implement `GameLayout` (generic 3-pane structure) to support future games.

    -   Slots: `LeftSidebar` (Roster), `MainContent` (Game Board), `RightSidebar` (Leaderboard/Config).

3.  **Shared Components:**

    -   `PlayerSidebar`: Reusable alphabetized roster list.
    -   `PlayerManager`: Reusable list-based modal for roster management.

4.  **Plinko Specifics:**

    -   `PlinkoGame`: The physics/canvas board (slots into `MainContent`).
    -   `PlinkoControls`: Game-specific controls.
    -   `PlinkoConfigPanel`: Game-specific settings.
    -   `PlinkoLeaderboard`: Game-specific scoring view.

### Phase 2: Game Feel (Audio & Visuals)

6.  **Custom Renderer:** Implement `usePlinkoRender` to replace `Matter.Render` with the custom Canvas loop (Glass/Light theme).
7.  **Sound:** Implement `useGameSounds` and hook up collision events.
8.  **Particles:** Add particle system for collisions and wins.

### Phase 3: Final Polish (Celebration)

9.  **Win Overlay:** Implement `WinCelebrationOverlay` with the physics ball-drop interaction.
10. **Tuning:** Final physics tweaks and animation smoothing (`framer-motion`).

## Proposed File Structure

-   `src/components/game/`
    -   `layout/`
        -   `GameLayout.tsx` (Generic 3-pane shell)
    -   `shared/`
        -   `PlayerSidebar.tsx`
        -   `PlayerManager.tsx`
    -   `plinko/`
        -   `PlinkoGame.tsx` (Canvas & Physics)
        -   `PlinkoControls.tsx`
        -   `PlinkoLeaderboard.tsx`
        -   `PlinkoConfigPanel.tsx`
        -   `WinCelebration.tsx`
        -   `hooks/`
            -   `usePlinkoPhysics.ts`
            -   `usePlinkoRender.ts`
            -   `useGameSounds.ts`
        -   `utils/`
            -   `particles.ts`