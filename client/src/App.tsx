import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import eruda from 'eruda';

type NodeData = {
  id: number;
  adjacency: number[]; // If the server is sending adjacency
  owner: string | null;
  troops: number;
};

type GameState = {
  nodes: NodeData[];
};

// Hardcode positions in a 3x3 layout
const nodePositions: Record<number, { x: number; y: number }> = {
  1: { x: 50,  y: 50  },
  2: { x: 150, y: 50  },
  3: { x: 250, y: 50  },
  4: { x: 50,  y: 150 },
  5: { x: 150, y: 150 },
  6: { x: 250, y: 150 },
  7: { x: 50,  y: 250 },
  8: { x: 150, y: 250 },
  9: { x: 250, y: 250 },
};

// Decide a radius for each node's circle
const NODE_RADIUS = 20;

if (import.meta.env.DEV) {
  eruda.init();
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // For selecting nodes
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [troopAmount, setTroopAmount] = useState<number>(10); // default to 10

  // Canvas reference
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Connect to the server
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    // On initial connection
    newSocket.on('connect', () => {
      console.log('Connected to server:', newSocket.id);
    });

    newSocket.on('gameState', (state) => {
      console.log('Received gameState:', state);
      setGameState(state);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Each time gameState changes, re-draw the canvas
  useEffect(() => {
    drawCanvas();
  }, [gameState]);

  // Draw the nodes & edges
  const drawCanvas = () => {
    if (!canvasRef.current || !gameState) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, 400, 400);

    // Draw edges first (if adjacency is in the gameState)
    for (const node of gameState.nodes) {
      for (const adj of node.adjacency) {
        // We only want to draw each edge once, so for example,
        // draw if adj > node.id to avoid double-drawing
        if (adj > node.id) {
          const fromPos = nodePositions[node.id];
          const toPos = nodePositions[adj];
          ctx.beginPath();
          ctx.strokeStyle = '#888';
          ctx.moveTo(fromPos.x, fromPos.y);
          ctx.lineTo(toPos.x, toPos.y);
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (const node of gameState.nodes) {
      const { x, y } = nodePositions[node.id];
      // Fill color depends on owner
      let fillColor = '#ccc';
      if (node.owner === 'player1') fillColor = 'blue';
      if (node.owner === 'player2') fillColor = 'red';

      // Draw circle
      ctx.beginPath();
      ctx.fillStyle = fillColor;
      ctx.arc(x, y, NODE_RADIUS, 0, 2 * Math.PI);
      ctx.fill();

      // Draw outline
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000';
      ctx.stroke();

      // Draw troop count
      ctx.fillStyle = '#000';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${node.troops}`, x, y);
    }
  };

  // Handle click on canvas to see which node was clicked
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !gameState) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Find if click is within any node's circle
    let clickedNodeId: number | null = null;
    for (const node of gameState.nodes) {
      const { x, y } = nodePositions[node.id];
      const dist = Math.sqrt(Math.pow(clickX - x, 2) + Math.pow(clickY - y, 2));
      if (dist <= NODE_RADIUS) {
        clickedNodeId = node.id;
        break;
      }
    }

    if (clickedNodeId) {
      // If we have no selectedNode, set it
      if (selectedNode === null) {
        setSelectedNode(clickedNodeId);
      } else {
        // We already had a selectedNode, so attempt to send troops from selectedNode -> clickedNodeId
        if (socket) {
          socket.emit('sendTroops', {
            fromNodeId: selectedNode,
            toNodeId: clickedNodeId,
            amount: troopAmount,
          });
        }
        // Reset selection (or you might want to keep fromNode the same)
        setSelectedNode(null);
      }
    }
  };

  // We can display which node is selected, and the troop amount
  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Graph RTS Tycoon (Canvas Demo)</h1>

      <p>Click one node to select it as the FROM node, then click another to send troops.</p>

      <div style={{ margin: '1rem auto' }}>
        <label>Troop Amount: </label>
        <input
          type='number'
          value={troopAmount}
          onChange={(e) => setTroopAmount(Number(e.target.value))}
          style={{ width: '60px' }}
        />
      </div>

      <p>
        {selectedNode
          ? `Selected FROM node: ${selectedNode}`
          : 'No node currently selected.'}
      </p>

      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        style={{ border: '1px solid black' }}
        onClick={handleCanvasClick}
      />
    </div>
  );
}

export default App;