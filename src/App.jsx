import { useCallback, useMemo, useState } from "react";
import ReactFlow, { Controls, Handle, MiniMap, Position, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

const NODE_WIDTH = 110;
const HORIZONTAL_GAP = 18;
const VERTICAL_GAP = 110;

const treeData = {
  id: "root",
  label: "root",
  isRoot: true,
  children: [
    {
      id: "child-1",
      label: "Child 1",
      children: [
        { id: "child-1-a", label: "New Node" },
        { id: "child-1-b", label: "New Node" },
        { id: "child-1-c", label: "New Node" },
      ],
    },
    {
      id: "child-2",
      label: "Child 2",
      children: [
        { id: "child-2-a", label: "New Node" },
        { id: "child-2-b", label: "New Node" },
      ],
    },
    { id: "node-3", label: "New Node" },
    {
      id: "node-4",
      label: "New Node",
      children: [{ id: "node-4-a", label: "New Node" }],
    },
    { id: "node-5", label: "New Node" },
    { id: "node-6", label: "New Node" },
  ],
};

function TreeNode({ data, selected }) {
  const hasChildren = data.childrenCount > 0;

  return (
    <div className={`tree-node ${data.isRoot ? "root-node" : ""} ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Top} className="hidden-handle" />
      <div className="node-title-row">{data.label}</div>
      {hasChildren && (
        <button className="expand-dot" onClick={data.onToggle} type="button" aria-label="toggle children">
          {data.collapsed ? "+" : ""}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className="hidden-handle" />
    </div>
  );
}

const nodeTypes = { treeNode: TreeNode };

function buildVisibleTree(root, collapsedIds) {
  function cloneVisible(node) {
    const isCollapsed = collapsedIds.has(node.id);
    const originalChildren = node.children ?? [];
    const visibleChildren = isCollapsed ? [] : originalChildren.map(cloneVisible);

    return {
      ...node,
      children: visibleChildren,
      childrenCount: originalChildren.length,
      collapsed: isCollapsed,
      isRoot: Boolean(node.isRoot),
    };
  }

  return cloneVisible(root);
}

function computeSubtreeWidth(node) {
  if (!node.children || node.children.length === 0) {
    return NODE_WIDTH;
  }

  const childWidths = node.children.map(computeSubtreeWidth);
  const childrenSpan =
    childWidths.reduce((total, width) => total + width, 0) +
    HORIZONTAL_GAP * (childWidths.length - 1);

  return Math.max(NODE_WIDTH, childrenSpan);
}

function layoutTree(node, depth, left, nodes, edges, onToggle) {
  const subtreeWidth = computeSubtreeWidth(node);
  const centerX = left + subtreeWidth / 2;
  const y = depth * VERTICAL_GAP;

  nodes.push({
    id: node.id,
    type: "treeNode",
    position: { x: centerX - NODE_WIDTH / 2, y },
    data: {
      label: node.label,
      isRoot: node.isRoot,
      collapsed: node.collapsed,
      childrenCount: node.childrenCount,
      onToggle: () => onToggle(node.id),
    },
  });

  if (!node.children || node.children.length === 0) {
    return;
  }

  let childLeft = left;
  node.children.forEach((child) => {
    const childWidth = computeSubtreeWidth(child);
    edges.push({
      id: `${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      type: "step",
      animated: false,
      style: { stroke: "#bcc7d8", strokeWidth: 1.2 },
    });

    layoutTree(child, depth + 1, childLeft, nodes, edges, onToggle);
    childLeft += childWidth + HORIZONTAL_GAP;
  });
}

function createGraph(root, collapsedIds, onToggle) {
  const visibleRoot = buildVisibleTree(root, collapsedIds);
  const nodes = [];
  const edges = [];
  layoutTree(visibleRoot, 0, 0, nodes, edges, onToggle);
  return { nodes, edges };
}

function TreeFlow() {
  const [collapsedIds, setCollapsedIds] = useState(() => new Set(["child-2"]));

  const handleToggle = useCallback((nodeId) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(
    () => createGraph(treeData, collapsedIds, handleToggle),
    [collapsedIds, handleToggle]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.22 }}
      panOnScroll
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
    >
      <MiniMap pannable zoomable />
      <Controls />
    </ReactFlow>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <main className="flow-container">
        <ReactFlowProvider>
          <TreeFlow />
        </ReactFlowProvider>
      </main>
    </div>
  );
}
