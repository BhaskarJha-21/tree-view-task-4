import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, { Controls, Handle, MiniMap, Position, ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

const NODE_WIDTH = 110;
const HORIZONTAL_GAP = 18;
const VERTICAL_GAP = 110;

const initialTreeData = {
  id: "root",
  label: "Root",
  isRoot: true,
  children: [
    {
      id: "child-1-a",
      label: "Child 1-A",
      children: [
        {
          id: "child-2-a",
          label: "Child 2-A",
          children: [
            {
              id: "child-3-a",
              label: "Child 3-A",
              children: [
                {
                  id: "child-4-a",
                  label: "Child 4-A",
                  children: [
                    {
                      id: "child-5-a",
                      label: "Child 5-A",
                      children: [{ id: "child-6-a", label: "Child 6-A" }],
                    },
                    { id: "child-5-b", label: "Child 5-B" },
                  ],
                },
                { id: "child-4-b", label: "Child 4-B" },
              ],
            },
          ],
        },
        { id: "child-2-b", label: "Child 2-B" },
      ],
    },
    {
      id: "child-1-b",
      label: "Child 1-B",
      children: [
        {
          id: "child-2-c",
          label: "Child 2-C",
          children: [
            { id: "child-3-b", label: "Child 3-B" },
            { id: "child-3-c", label: "Child 3-C" },
          ],
        },
        { id: "child-2-d", label: "Child 2-D" },
      ],
    },
    { id: "child-1-c", label: "Child 1-C" },
    { id: "child-1-d", label: "Child 1-D" },
  ],
};

function TreeNode({ data, selected }) {
  const hasChildren = data.childrenCount > 0;
  const isSearchMatch = data.searchActive && data.matchesSearch;
  const isDimmed = data.searchActive && !data.matchesSearch;

  return (
    <div
      className={`tree-node ${data.isRoot ? "root-node" : ""} ${selected ? "selected" : ""} ${
        isSearchMatch ? "search-match" : ""
      } ${isDimmed ? "search-dim" : ""}`}
    >
      <Handle type="target" position={Position.Top} className="hidden-handle" />
      <div className="node-title-row">{data.label}</div>
      {hasChildren && (
        <button className="expand-dot" onClick={data.onToggle} type="button" aria-label="toggle children">
          {data.collapsed ? "+" : "-"}
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className="hidden-handle" />
    </div>
  );
}

const nodeTypes = { treeNode: TreeNode };

function addChildToTree(node, targetId, childNode) {
  if (node.id === targetId) {
    return {
      ...node,
      children: [...(node.children ?? []), childNode],
    };
  }

  if (!node.children || node.children.length === 0) {
    return node;
  }

  let hasChanges = false;
  const nextChildren = node.children.map((child) => {
    const updatedChild = addChildToTree(child, targetId, childNode);
    if (updatedChild !== child) {
      hasChanges = true;
    }
    return updatedChild;
  });

  return hasChanges ? { ...node, children: nextChildren } : node;
}

function renameNodeInTree(node, targetId, nextLabel) {
  if (node.id === targetId) {
    return { ...node, label: nextLabel };
  }
  if (!node.children || node.children.length === 0) {
    return node;
  }

  let hasChanges = false;
  const nextChildren = node.children.map((child) => {
    const updatedChild = renameNodeInTree(child, targetId, nextLabel);
    if (updatedChild !== child) {
      hasChanges = true;
    }
    return updatedChild;
  });

  return hasChanges ? { ...node, children: nextChildren } : node;
}

function deleteNodeFromTree(node, targetId) {
  if (!node.children || node.children.length === 0) {
    return node;
  }

  let hasChanges = false;
  const nextChildren = [];

  node.children.forEach((child) => {
    if (child.id === targetId) {
      hasChanges = true;
      return;
    }

    const updatedChild = deleteNodeFromTree(child, targetId);
    if (updatedChild !== child) {
      hasChanges = true;
    }
    nextChildren.push(updatedChild);
  });

  return hasChanges ? { ...node, children: nextChildren } : node;
}

function collectNodeIds(node, ids) {
  ids.add(node.id);
  (node.children ?? []).forEach((child) => collectNodeIds(child, ids));
}

function filterCollapsedIds(root, collapsedIds) {
  const validIds = new Set();
  collectNodeIds(root, validIds);
  return new Set([...collapsedIds].filter((id) => validIds.has(id)));
}

function findNodeById(node, nodeId) {
  if (!nodeId) {
    return null;
  }
  if (node.id === nodeId) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNodeById(child, nodeId);
    if (found) {
      return found;
    }
  }
  return null;
}

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

function layoutTree(node, depth, left, nodes, edges, onToggle, searchTerm) {
  const subtreeWidth = computeSubtreeWidth(node);
  const centerX = left + subtreeWidth / 2;
  const y = depth * VERTICAL_GAP;
  const normalizedLabel = node.label.toLowerCase();
  const matchesSearch = Boolean(searchTerm) && normalizedLabel.includes(searchTerm);

  nodes.push({
    id: node.id,
    type: "treeNode",
    position: { x: centerX - NODE_WIDTH / 2, y },
    style: {
      transition: "transform 220ms ease, opacity 160ms ease, box-shadow 140ms ease",
    },
    data: {
      label: node.label,
      isRoot: node.isRoot,
      collapsed: node.collapsed,
      childrenCount: node.childrenCount,
      matchesSearch,
      searchActive: Boolean(searchTerm),
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

    layoutTree(child, depth + 1, childLeft, nodes, edges, onToggle, searchTerm);
    childLeft += childWidth + HORIZONTAL_GAP;
  });
}

function createGraph(root, collapsedIds, onToggle, searchTerm) {
  const visibleRoot = buildVisibleTree(root, collapsedIds);
  const nodes = [];
  const edges = [];
  layoutTree(visibleRoot, 0, 0, nodes, edges, onToggle, searchTerm.trim().toLowerCase());
  return { nodes, edges };
}

function TreeFlow() {
  const [treeRoot, setTreeRoot] = useState(initialTreeData);
  const [collapsedIds, setCollapsedIds] = useState(() => new Set(["child-1-b"]));
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [lastDeletedState, setLastDeletedState] = useState(null);
  const [renameValue, setRenameValue] = useState("Root");
  const nodeCounterRef = useRef(1);
  const selectedNode = useMemo(() => findNodeById(treeRoot, selectedNodeId), [treeRoot, selectedNodeId]);

  useEffect(() => {
    setRenameValue(selectedNode?.label ?? "");
  }, [selectedNodeId, selectedNode]);

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

  const handleAddChild = useCallback(() => {
    if (!selectedNodeId) {
      return;
    }

    const nextNumber = nodeCounterRef.current;
    nodeCounterRef.current += 1;
    const newNode = {
      id: `child-new-${nextNumber}`,
      label: `Child New ${nextNumber}`,
    };

    setTreeRoot((previous) => addChildToTree(previous, selectedNodeId, newNode));
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      next.delete(selectedNodeId);
      return next;
    });
  }, [selectedNodeId]);

  const handleDeleteNode = useCallback(() => {
    if (!selectedNodeId || selectedNodeId === "root") {
      return;
    }
    const selectedLabel = selectedNode?.label ?? selectedNodeId;
    const shouldDelete = window.confirm(`Delete "${selectedLabel}" and all its children?`);
    if (!shouldDelete) {
      return;
    }

    setLastDeletedState({
      treeRoot,
      collapsedIds: new Set(collapsedIds),
      selectedNodeId,
    });
    setTreeRoot((previous) => {
      const nextTree = deleteNodeFromTree(previous, selectedNodeId);
      setCollapsedIds((previousCollapsed) => filterCollapsedIds(nextTree, previousCollapsed));
      return nextTree;
    });
    setSelectedNodeId("root");
  }, [selectedNodeId, selectedNode, treeRoot, collapsedIds]);

  const handleRenameNode = useCallback(() => {
    if (!selectedNodeId || !selectedNode) {
      return;
    }
    const trimmedLabel = renameValue.trim();
    if (!trimmedLabel) {
      return;
    }

    setTreeRoot((previous) => renameNodeInTree(previous, selectedNodeId, trimmedLabel));
  }, [selectedNodeId, selectedNode, renameValue]);

  const handleUndoDelete = useCallback(() => {
    if (!lastDeletedState) {
      return;
    }
    setTreeRoot(lastDeletedState.treeRoot);
    setCollapsedIds(lastDeletedState.collapsedIds);
    setSelectedNodeId(lastDeletedState.selectedNodeId);
    setLastDeletedState(null);
  }, [lastDeletedState]);

  const { nodes, edges } = useMemo(
    () => createGraph(treeRoot, collapsedIds, handleToggle, searchTerm),
    [treeRoot, collapsedIds, handleToggle, searchTerm]
  );

  return (
    <div className="tree-flow-shell">
      <div className="toolbar">
        <div className="toolbar-row">
          <input
            className="search-input"
            type="text"
            placeholder="Search node label..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <input
            className="rename-input"
            type="text"
            placeholder="Rename selected node..."
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            disabled={!selectedNodeId || !selectedNode}
          />
          <div className="toolbar-actions">
            <button className="toolbar-button" type="button" onClick={handleAddChild} disabled={!selectedNodeId}>
              Add Child
            </button>
            <button
              className="toolbar-button"
              type="button"
              onClick={handleRenameNode}
              disabled={!selectedNodeId || !selectedNode}
            >
              Rename Node
            </button>
            <button
              className="toolbar-button danger"
              type="button"
              onClick={handleDeleteNode}
              disabled={!selectedNodeId || selectedNodeId === "root"}
            >
              Delete Node
            </button>
            <button className="toolbar-button" type="button" onClick={handleUndoDelete} disabled={!lastDeletedState}>
              Undo Delete
            </button>
          </div>
        </div>
        <div className="toolbar-meta">
          Selected: {selectedNode ? selectedNode.label : "None"} {selectedNodeId === "root" ? "(root protected)" : ""}
        </div>
      </div>
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
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
      >
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
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
