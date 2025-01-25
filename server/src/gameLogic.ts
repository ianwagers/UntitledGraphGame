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
  
  // Create initial 9-node "square" grid (3x3):
  export function createInitialGameState(): GameState {
    const nodes: NodeData[] = [
      { id: 1, adjacency: [2, 4, 5],       owner: null, ownerColor: null, troops: 0 },
      { id: 2, adjacency: [1, 3, 5],    owner: null, ownerColor: null, troops: 0 },
      { id: 3, adjacency: [2, 5, 6],       owner: null, ownerColor: null, troops: 0 },
      { id: 4, adjacency: [1, 5, 7],    owner: null, ownerColor: null, troops: 0 },
      { id: 5, adjacency: [1, 2, 3, 4, 5, 6, 7, 8, 9], owner: null, ownerColor: null, troops: 0 },
      { id: 6, adjacency: [3, 5, 9],    owner: null, ownerColor: null, troops: 0 },
      { id: 7, adjacency: [4, 5, 8],       owner: null, ownerColor: null, troops: 0 },
      { id: 8, adjacency: [5, 7, 9],    owner: null, ownerColor: null, troops: 0 },
      { id: 9, adjacency: [5, 6, 8],       owner: null, ownerColor: null, troops: 0 },
    ];
  
    return { nodes };
  }