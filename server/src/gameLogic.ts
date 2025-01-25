// gameLogic.ts

export interface NodeData {
    id: number;
    adjacency: number[];
    owner: string | null;  // e.g. "player1", "player2", or null
    troops: number;
  }
  
  export interface GameState {
    nodes: NodeData[];
  }
  
  // Create initial 9-node "square" grid (3x3):
  export function createInitialGameState(): GameState {
    // For demonstration:
    // - Player 1 initially owns Node 1
    // - Player 2 initially owns Node 9
    // - All other nodes start neutral
    // - Each node begins with 1 troop
    const nodes: NodeData[] = [
      { id: 1, adjacency: [2, 4],       owner: 'player1', troops: 1 },
      { id: 2, adjacency: [1, 3, 5],    owner: null,       troops: 1 },
      { id: 3, adjacency: [2, 6],       owner: null,       troops: 1 },
      { id: 4, adjacency: [1, 5, 7],    owner: null,       troops: 1 },
      { id: 5, adjacency: [2, 4, 6, 8], owner: null,       troops: 1 },
      { id: 6, adjacency: [3, 5, 9],    owner: null,       troops: 1 },
      { id: 7, adjacency: [4, 8],       owner: null,       troops: 1 },
      { id: 8, adjacency: [5, 7, 9],    owner: null,       troops: 1 },
      { id: 9, adjacency: [6, 8],       owner: 'player2', troops: 1 },
    ];
  
    return { nodes };
  }