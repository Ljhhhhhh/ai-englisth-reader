# Generate Upload Module Design

## Intent

Redesign the file-upload module on the generate page into a study-room inspired "desk tray" interaction. The goal is to make the upload flow feel deliberate and tactile while keeping the existing generation behavior unchanged.

## Approved Direction

- Visual tone: study-room / reading desk
- UX priority: stronger ritual and atmosphere over generic SaaS efficiency
- Scope: file upload mode inside `src/app/generate/page.tsx`

## Design Decisions

- Replace the exposed native file input with a large clickable upload tray.
- Use layered warm surfaces, inset borders, and soft shadows to evoke paper on a desk.
- Separate the module into three readable areas:
  - primary drop/click action
  - supported formats and constraints
  - selected-file confirmation state
- Keep wording aligned with the reading/workbench metaphor.

## Non-Goals

- No backend or upload behavior changes
- No drag-and-drop implementation in this pass
- No new dependencies

## Validation

- Existing URL submission flow remains functional.
- File mode still accepts `.md`, `.txt`, `.docx`.
- Selected file name is visible after choosing a file.
