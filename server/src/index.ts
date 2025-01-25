import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);

// Socket.IO server, allow CORS from client dev server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

// NodeData / GameState interfaces
interface NodeData {
  id: number;
  adjacency: number[];       // IDs of adjacent nodes
  owner: string | null;      // e.g. "player1", "player2", or null
  troops: number;            // current troop count
}

interface GameState {
  nodes: NodeData[];
}

// Create initial 9-node square grid
function createInitialGameState(): GameState {
  // We place Player 1 at node 1, and Player 2 at node 9 (you can rename them or track them differently).
  const nodes: NodeData[] = [
    { id: 1, adjacency: [2, 4],     owner: "player1", troops: 1 },
    { id: 2, adjacency: [1, 3, 5],  owner: null,       troops: 1 },
    { id: 3, adjacency: [2, 6],     owner: null,       troops: 1 },
    { id: 4, adjacency: [1, 5, 7],  owner: null,       troops: 1 },
    { id: 5, adjacency: [2, 4, 6, 8], owner: null,     troops: 1 },
    { id: 6, adjacency: [3, 5, 9],  owner: null,       troops: 1 },
    { id: 7, adjacency: [4, 8],     owner: null,       troops: 1 },
    { id: 8, adjacency: [5, 7, 9],  owner: null,       troops: 1 },
    { id: 9, adjacency: [6, 8],     owner: "player2", troops: 1 },
  ];

  return { nodes };
}

let gameState: GameState = createInitialGameState();

// We can keep track of which socket is "player1" vs "player2"
const playerAssignments = new Map<string, string>(); // socket.id -> "player1" or "player2"
// Keep track of how many have joined
let assignedCount = 0;

// Increase troops for each owned node every second
setInterval(() => {
  for (const node of gameState.nodes) {
    if (node.owner) {
      node.troops += 1; // or your growth rate
    }
  }

  // After updating, broadcast the new state to all clients
  io.emit('gameState', gameState);
}, 1000);

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Assign this socket a player if we haven't assigned 2 yet.
  if (assignedCount < 2) {
    assignedCount++;
    const playerId = `player${assignedCount}`; // "player1" or "player2"
    playerAssignments.set(socket.id, playerId);
    console.log(`Assigned socket ${socket.id} to ${playerId}`);
  } else {
    console.log('Already 2 players assigned. This client can observe but not control.');
  }

  // Send current game state to the newly connected client
  socket.emit('gameState', gameState);

  // Example: handle "sendTroops" from client
  socket.on('sendTroops', (data: { fromNodeId: number; toNodeId: number; amount: number }) => {
    console.log(
      `Player ${socket.id} wants to send ${data.amount} troops from node ${data.fromNodeId} to node ${data.toNodeId}`
    );

    // 1. Validate fromNodeId and toNodeId exist
    const fromNode = gameState.nodes.find((n) => n.id === data.fromNodeId);
    const toNode = gameState.nodes.find((n) => n.id === data.toNodeId);
    if (!fromNode || !toNode) {
      console.log('Invalid node IDs');
      return;
    }

    // 2. Check adjacency
    if (!fromNode.adjacency.includes(toNode.id)) {
      console.log(`Node ${toNode.id} is not adjacent to ${fromNode.id}.`);
      return;
    }

    // 3. Determine which player is controlling this socket
    const controllingPlayer = playerAssignments.get(socket.id);
    if (!controllingPlayer) {
      console.log('This socket is not assigned a player slot');
      return;
    }

    // 4. Check if the fromNode is owned by that controlling player
    if (fromNode.owner !== controllingPlayer) {
      console.log(`Node ${fromNode.id} is not owned by ${controllingPlayer}.`);
      return;
    }

    // 5. Check if enough troops to send
    if (fromNode.troops < data.amount || data.amount < 10) {
      console.log(`Not enough troops or below minimum send threshold.`);
      return;
    }

    // 6. Deduct from fromNode
    fromNode.troops -= data.amount;

    // 7. Apply conflict resolution on toNode
    if (toNode.owner === null) {
      // If unowned, the sending player takes it over
      toNode.owner = controllingPlayer;
      toNode.troops = data.amount;
    } else if (toNode.owner === controllingPlayer) {
      // If already owned by the same player, just reinforce
      toNode.troops += data.amount;
    } else {
      // Owned by another player: conflict
      if (toNode.troops > data.amount) {
        // Defender still has some troops left
        toNode.troops -= data.amount;
      } else if (toNode.troops < data.amount) {
        // Attacker wins, takes over
        toNode.owner = controllingPlayer;
        toNode.troops = data.amount - toNode.troops; // remainder after defeating defenders
      } else {
        // toNode.troops === data.amount -> tie, node becomes neutral?
        toNode.owner = null;
        toNode.troops = 0;
      }
    }

    // 8. Broadcast updated game state
    io.emit('gameState', gameState);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    // Possibly handle what happens if the player owns nodes
    // If you want to unassign them or reassign. For now, we do nothing.
  });
});


// Basic endpoint (for testing)
app.get('/', (req, res) => {
  res.send('Server is running! Connect via Socket.IO for the game client.');
});

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});