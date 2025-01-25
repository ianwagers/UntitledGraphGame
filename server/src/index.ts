// SERVER - index.ts

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createInitialGameState, GameState, NodeData } from './gameLogic'; // <-- import here

const app = express();
const httpServer = createServer(app);

// Socket.IO server, allow CORS from client dev server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

// Create the initial game state
let gameState: GameState = createInitialGameState();

// We will only increment troops after all players have picked starting nodes
let gameRunning = false;

// Setup player interface
interface Player {
  id: string;
  name: string;
  color: string;
  ready: boolean;    // True when the player has chosen a starting node
  observer: boolean; // Additional connections beyond maxPlayers could be observers
}

const players: Record<string, Player> = {};
const maxPlayers = 2;

// Increase troops for each owned node every second, but only if the game is running
setInterval(() => {
  if (gameRunning) {
    for (const node of gameState.nodes) {
      if (node.owner) {
        node.troops += 1; // or your chosen growth rate
      }
    }
    // Broadcast the new state to all clients
    io.emit('gameState', gameState);
  }
}, 1000);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Decide if this connection is a main player or observer
  const currentPlayerCount = Object.values(players).filter((p) => !p.observer).length;
  if (currentPlayerCount < maxPlayers) {
    // Not full yet, can be a main player
    players[socket.id] = {
      id: socket.id,
      name: '',
      color: '#ffffff',
      ready: false,
      observer: false,
    };
  } else {
    // Mark as observer if maxPlayers is reached
    players[socket.id] = {
      id: socket.id,
      name: `Observer-${socket.id}`,
      color: '#888888',
      ready: false,
      observer: true,
    };
  }

  // Setup initial "setPlayerInfo" handler
  socket.on('setPlayerInfo', ({ name, color }) => {
    if (players[socket.id]) {
      // Only allow setting these if not an observer
      if (!players[socket.id].observer) {
        players[socket.id].name = name;
        players[socket.id].color = color;
        console.log(`${name} joined with color ${color} (ID ${socket.id})`);
      } else {
        console.log(`Observer joined: ${socket.id}`);
      }
    }
  });

  // Player selects a starting node
  socket.on('selectStartNode', ({ nodeId }) => {
    const thisPlayer = players[socket.id];
    if (!thisPlayer || thisPlayer.observer) return; // ignore observers or missing

    // Check if node is valid
    const theNode = gameState.nodes.find((n) => n.id === nodeId);
    if (!theNode) return;

    // Check if node is unowned
    if (theNode.owner) {
      console.log(`Node ${nodeId} is already owned, ignoring.`);
      return;
    }

    // Assign ownership to this player
    theNode.owner = thisPlayer.id;
    theNode.ownerColor = thisPlayer.color;
    theNode.troops = 1;

    // Mark player as having chosen a start node
    thisPlayer.ready = true;
    console.log(`${thisPlayer.name} selected node ${nodeId} as a start node.`);

    // Send back updated game state
    io.emit('gameState', gameState);

    // Notify this specific client that they have successfully selected
    socket.emit('selectStartNodeSuccess');

    // Check if all main players (non-observers) have chosen a start node
    const mainPlayers = Object.values(players).filter((p) => !p.observer);
    const allHaveStarted = mainPlayers.length === maxPlayers &&
                           mainPlayers.every((p) => p.ready);

    if (allHaveStarted) {
      gameRunning = true;
      io.emit('startGame');
      console.log('All players selected start nodes. Game is now running.');
    }
  });

  // Send current game state to the newly connected client
  socket.emit('gameState', gameState);

  // Handle troop sending
  socket.on('sendTroops', (data: { fromNodeId: number; toNodeId: number; amount: number }) => {
    console.log(
      `Player ${socket.id} wants to send ${data.amount} troops from node ${data.fromNodeId} to node ${data.toNodeId}`
    );

    const fromNode = gameState.nodes.find((n) => n.id === data.fromNodeId);
    const toNode = gameState.nodes.find((n) => n.id === data.toNodeId);

    if (!fromNode || !toNode) {
      console.log('Invalid node IDs');
      return;
    }

    // Check adjacency
    if (!fromNode.adjacency.includes(toNode.id)) {
      console.log(`Node ${toNode.id} is not adjacent to ${fromNode.id}.`);
      return;
    }

    // Which player is controlling this socket?
    const controllingPlayer = players[socket.id]?.id;
    if (!controllingPlayer) {
      console.log('This socket is not assigned a main player slot.');
      return;
    }

    // Check if the fromNode is owned by that controlling player
    if (fromNode.owner !== controllingPlayer) {
      console.log(`Node ${fromNode.id} is not owned by ${controllingPlayer}.`);
      return;
    }

    // Check if enough troops and above minimum
    if (fromNode.troops < data.amount || data.amount < 10) {
      console.log('Not enough troops or below minimum (10).');
      return;
    }

    // Deduct from fromNode
    fromNode.troops -= data.amount;

    // Conflict resolution on toNode
    if (toNode.owner === null) {
      // Unowned -> take over
      toNode.owner = controllingPlayer;
      toNode.ownerColor = players[socket.id].color; // set color
      toNode.troops = data.amount;
    } else if (toNode.owner === controllingPlayer) {
      // Same owner -> reinforce
      toNode.troops += data.amount;
    } else {
      // Owned by another player: conflict
      if (toNode.troops > data.amount) {
        toNode.troops -= data.amount; // defenders survive
      } else if (toNode.troops < data.amount) {
        // attacker wins, remainder is new troop count
        toNode.owner = controllingPlayer;
        toNode.ownerColor = players[socket.id].color;
        toNode.troops = data.amount - toNode.troops;
      } else {
        // exact tie -> node becomes neutral
        toNode.owner = null;
        toNode.ownerColor = null;
        toNode.troops = 0;
      }
    }

    // Broadcast updated game state
    io.emit('gameState', gameState);

    // Check for win condition
    const uniqueOwners = new Set(gameState.nodes.map((n) => n.owner));
    
    if (uniqueOwners.size === 1 && !uniqueOwners.has(null)) {
      // This tells TS that this array contains only strings, not null
      const [winningPlayerId] = Array.from(uniqueOwners) as string[];
    
      const winnerName = players[winningPlayerId]?.name || "Unknown Player";
      console.log(`${winnerName} has won the game!`);
    
      // Inform everyone about the game over
      io.emit('gameOver', {
        winnerId: winningPlayerId,
        winnerName
      });
    } // <-- Add this closing curly brace here!

  });
    
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      // Optional: handle node ownership if a user leaves
      // ...
    });
});

// Basic test endpoint
app.get('/', (req, res) => {
  res.send('Server is running! Connect via Socket.IO for the game client.');
});

// Start server
const PORT = Number(process.env.PORT) || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});