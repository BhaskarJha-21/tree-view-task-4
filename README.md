# Tree View (Task 4)

React Flow based tree visualizer for hierarchical data with:

- computed sibling spacing
- parent centering over visible children
- parent-child edges
- expand/collapse for any node with children
- automatic layout recalculation on toggle

## Tech

- React
- Vite
- React Flow

## Setup

```bash
npm install
```

## Run

```bash
npm run dev
```

Open the local URL shown by Vite in your terminal.

## Build

```bash
npm run build
```

## Notes

- The layout is calculated client-side with simple recursive subtree width math.
- Collapsing a node hides descendants and re-centers remaining visible branches.
- Sample metadata, hover styles, node selection highlight, and minimap/controls are included.
