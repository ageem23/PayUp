### `docs/epics/epic-06-assignment-mutations/story_06_1_checkbox_grid.md`
```markdown
# Story 6.1: Matrix Cell Checkbox Rendering & Dynamic State Mapping Loop

### Status
**Ready for Development**

### Story
**As a** user splitting a bill,
**I want** high-contrast checkbox nodes rendered inside every cell intersection of the matrix grid,
**so that** I can intuitively link participants to the line items they consumed.

### Acceptance Criteria
1. The matrix view renders an interactive cell intersection for every line-item row crossed against every participant column.
2. Cells contain a high-contrast, touch-optimized visual checkbox element that highlights clearly when selected.
3. Checking or unchecking a box toggles local component state arrays immediately, providing crisp visual feedback.
4. Hovering or clicking a checkbox cell clearly highlights the active column header and row title, preventing eye strain and accidental mis-clicks.

### Tasks / Subtasks
- [ ] Refactor the table row component inside `components/feature/MatrixRowItem.tsx` to handle nested loops.
- [ ] Map the participant list horizontally inside the row body to match header bounds:
  ```typescript
  {participants.map((participantName) => (
    <td key={participantName} className="border-t p-3 text-center">
      <input 
        type="checkbox"
        checked={isParticipantAssigned(item.id, participantName)}
        onChange={(e) => handleToggleSelection(item.id, participantName, e.target.checked)}
        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
    </td>
  ))}