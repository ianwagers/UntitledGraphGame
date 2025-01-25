// CLIENT - App.tsx

import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import Eruda from "eruda";

// Types matching your server
interface NodeData {
  id: number;
  adjacency: number[];
  owner: string | null;
  ownerColor: string | null;
  troops: number;
}

interface GameState {
  nodes: NodeData[];
}

const SOCKET_SERVER_URL = "http://10.0.0.187:3001"; // Replace with your server IP/port

// Pre-define positions for each node in a 3x3 layout
const NODE_POSITIONS: Record<number, { x: number; y: number }> = {
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

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Track troop sending
  const [selectedFromNode, setSelectedFromNode] = useState<number | null>(null);
  const [selectedToNode, setSelectedToNode] = useState<number | null>(null);
  const [troopAmount, setTroopAmount] = useState<number>(10);

  // Lobby & player info
  const [name, setName] = useState("");
  const [color, setColor] = useState("#ffffff");

  // Has this local player chosen a start node?
  const [hasSelectedStartNode, setHasSelectedStartNode] = useState(false);

  // Has the server signaled game started?
  const [gameStarted, setGameStarted] = useState(false);

  // After name is entered, show the game board
  const [inLobby, setInLobby] = useState(true);

  useEffect(() => {
    // Initialize Eruda for debugging on mobile
    if (typeof window !== "undefined") {
      //Eruda.init();
      console.log("Skipping Eruda for now");
    }

    // Connect Socket.IO
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);

    // Listen for game state updates
    newSocket.on("gameState", (state: GameState) => {
      setGameState(state);
    });

    // Listen for "startGame" event from server
    newSocket.on("startGame", () => {
      setGameStarted(true);
    });

    // Listen for when this player successfully selects a start node
    newSocket.on("selectStartNodeSuccess", () => {
      setHasSelectedStartNode(true);
    });

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on("gameOver", ({ winnerId, winnerName }) => {
        alert(`Game Over! The winner is ${winnerName}`);
        // Optionally show some UI or reload
      });
    }
  }, [socket]);  

  // Once user sets name/color, we join the game & show the map
  const handleJoinGame = () => {
    if (!socket) return;

    if (name.trim() === "") {
      alert("Please enter a valid name!");
      return;
    }

    // Send info to server
    socket.emit("setPlayerInfo", { name, color });
    // Move out of the lobby
    setInLobby(false);
  };

  // Handle node click
  // If the game hasn't started, we might be selecting our start node
  // If the game has started, we might be selecting from/to nodes for troop sending
  const handleNodeClick = (nodeId: number) => {
    if (!socket || !gameState) return;

    // If the game hasn't started, we are picking our starting node
    if (!gameStarted) {
      if (!hasSelectedStartNode) {
        // Attempt to select this node as start node
        socket.emit("selectStartNode", { nodeId });
      }
      return;
    }

    // Otherwise, game is in progress => choose from/to for sending
    if (selectedFromNode === null) {
      setSelectedFromNode(nodeId);
    } else if (selectedToNode === null) {
      // if the user clicks the same node for "to", ignore or reset:
      if (nodeId === selectedFromNode) {
        // same node clicked, let's reset
        setSelectedFromNode(null);
        setSelectedToNode(null);
      } else {
        setSelectedToNode(nodeId);
      }
    } else {
      // If fromNode and toNode are already set, let's reset
      setSelectedFromNode(nodeId);
      setSelectedToNode(null);
    }
  };

  // Emit 'sendTroops' to server
  const handleSendTroops = () => {
    if (!socket || selectedFromNode === null || selectedToNode === null) return;
    socket.emit("sendTroops", {
      fromNodeId: selectedFromNode,
      toNodeId: selectedToNode,
      amount: troopAmount,
    });
  };

  // Render edges (lines) for adjacency
  const renderEdges = () => {
    if (!gameState) return null;

    const lines: React.ReactNode[] = [];
    for (let node of gameState.nodes) {
      const { x: x1, y: y1 } = NODE_POSITIONS[node.id];
      for (let adj of node.adjacency) {
        // draw each edge only once
        if (adj > node.id) {
          const { x: x2, y: y2 } = NODE_POSITIONS[adj];
          lines.push(
            <line
              key={`edge-${node.id}-${adj}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="black"
              strokeWidth={2}
            />
          );
        }
      }
    }
    return lines;
  };

  // Render the 9 circles (one for each node)
  const renderNodes = () => {
    if (!gameState) return null;

    return gameState.nodes.map((node) => {
      const { x, y } = NODE_POSITIONS[node.id];
      const fillColor = node.ownerColor ? node.ownerColor : "gray";

      // Outline if this node is the currently selected "from" node
      const isFromSelected = node.id === selectedFromNode;

      return (
        <React.Fragment key={node.id}>
          <circle
            cx={x}
            cy={y}
            r={20}
            fill={fillColor}
            stroke={isFromSelected ? "yellow" : "black"}
            strokeWidth={isFromSelected ? 4 : 2}
            onClick={() => handleNodeClick(node.id)}
            style={{ cursor: "pointer" }}
          />
          <text
            x={x}
            y={y + 5}
            textAnchor="middle"
            fontSize={14}
            fill="white"
            fontWeight="bold"
          >
            {node.troops}
          </text>
        </React.Fragment>
      );
    });
  };

  // If still in the lobby, show name/color selection
  if (inLobby) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h1>Untitled Graph Game</h1>
        <p>Enter your name and color to join the game.</p>
        <label>
          Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginLeft: "10px", padding: "5px" }}
          />
        </label>
        <div style={{ marginTop: "10px" }}>
          <p>Select a color:</p>
          {["red","blue","cyan","purple","green","yellow","pink"].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                backgroundColor: c,
                color: "#fff",
                margin: "0 5px",
                padding: "10px",
                border: color === c ? "3px solid #000" : "none",
                cursor: "pointer"
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={handleJoinGame}
            style={{
              padding: "10px 20px",
              backgroundColor: color,
              color: "#111",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  // Once we're past the lobby, show the game area
  // But the game might not be fully started if not everyone has picked a node
  let statusMessage = "";
  if (!gameStarted) {
    // Not started yet
    if (!hasSelectedStartNode) {
      statusMessage = "Select a starting node.";
    } else {
      statusMessage = "Waiting for other players...";
    }
  } else {
    statusMessage = "Game in progress.";
  }

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Untitled Graph Game</h1>
      <p>{statusMessage}</p>

      {gameState ? (
        <>
          {/* For sending troops once the game has started */}
          {gameStarted && (
            <div style={{ marginBottom: "1rem" }}>
              <div>
                <label>Troops to send: {troopAmount}</label>
                <input
                  type="range"
                  min={10}
                  max={200}
                  value={troopAmount}
                  onChange={(e) => setTroopAmount(Number(e.target.value))}
                  style={{ marginLeft: "10px", width: "200px" }}
                />
              </div>
              <div style={{ marginTop: "10px" }}>
                <button onClick={handleSendTroops}>Send Troops</button>
              </div>

              <div style={{ marginTop: "10px" }}>
                <p>Sending node selected: {selectedFromNode ?? "None"}</p>
                <p>Receiving node selected: {selectedToNode ?? "None"}</p>
              </div>
            </div>
          )}

          <svg width={300} height={300} style={{ border: "1px solid black" }}>
            {renderEdges()}
            {renderNodes()}
          </svg>
        </>
      ) : (
        <p>Loading game state...</p>
      )}
    </div>
  );
};

export default App;