// SERVER - gameLogic.ts

export interface NodeData {
    id: number;
    adjacency: number[];
    owner: string | null;       // player ID who owns this node
    ownerColor: string | null;  // color to display for the owner
    troops: number;
  }
  
  export interface GameState {
    nodes: NodeData[];
  }
  
  export function createInitialGameState(): { nodes: NodeData[]; nodePositions: { [id: number]: { x: number; y: number } } } {
    const nodes: NodeData[] = [];
    const NODE_POSITIONS: { [id: number]: { x: number; y: number } } = {};
    const gridSize = 5; // 5x5 grid
    const spacing = 75; // Spacing between nodes
    const xOffset = 50; // Horizontal offset to move grid right
    const yOffset = 50; // Vertical offset to move grid down
  
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const id = row * gridSize + col + 1; // Node ID starts from 1
        const adjacency: number[] = [];
  
        // Calculate neighbors
        if (row > 0) adjacency.push(id - gridSize); // Node above
        if (row < gridSize - 1) adjacency.push(id + gridSize); // Node below
        if (col > 0) adjacency.push(id - 1); // Node to the left
        if (col < gridSize - 1) adjacency.push(id + 1); // Node to the right
  
        // Add main diagonal connections
        if (row === col) {
          if (id - gridSize - 1 > 0) adjacency.push(id - gridSize - 1); // Top-left to bottom-right
          if (id + gridSize + 1 <= gridSize * gridSize) adjacency.push(id + gridSize + 1);
        }
        if (row + col === gridSize - 1) {
          if (id - gridSize + 1 > 0) adjacency.push(id - gridSize + 1); // Top-right to bottom-left
          if (id + gridSize - 1 <= gridSize * gridSize) adjacency.push(id + gridSize - 1);
        }
  
        // Add the node to the list
        nodes.push({
          id,
          adjacency,
          owner: null,
          ownerColor: null,
          troops: 0,
        });
  
        // Add position for the node with offset
        NODE_POSITIONS[id] = {
          x: col * spacing + xOffset,
          y: row * spacing + yOffset,
        };
      }
    }
  
    return { nodes, nodePositions: NODE_POSITIONS };
  }
  