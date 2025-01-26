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
  nodePositions: { [id: number]: { x: number; y: number } };
}

const SOCKET_SERVER_URL = "http://10.0.0.187:3001"; // Replace with your server IP/port

// Pre-define positions for each node in a 3x3 layout
/*
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
*/

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Track troop sending
  const [nodePositions, setNodePositions] = useState<{ [id: number]: { x: number; y: number } } | null>(null);
  const [selectedFromNode, setSelectedFromNode] = useState<number | null>(null);
  const [selectedToNode, setSelectedToNode] = useState<number | null>(null);
  const [troopAmount, setTroopAmount] = useState<number>(10);
  const MAX_TROOPS_TO_SEND = 100;

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
      setNodePositions(state.nodePositions);
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

    if (color === "#ffffff") {
      alert("Please select a color!");
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
  if (!nodePositions) return null;

  const lines: React.ReactNode[] = [];
  for (let node of gameState.nodes) {
    const { x: x1, y: y1 } = nodePositions[node.id];
    for (let adj of node.adjacency) {
      // Draw each edge only once
      if (adj > node.id) {
        if (!nodePositions[adj]) {
          console.error(`Missing position for adjacent node ${adj}`);
          continue; // Skip undefined positions
        }
        const { x: x2, y: y2 } = nodePositions[adj];
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

// Render the 25 circles (one for each node)
const renderNodes = () => {
  if (!gameState) return null;
  if (!nodePositions) return null;

  return gameState.nodes.map((node) => {
    const { x, y } = nodePositions[node.id];
    const fillColor = node.ownerColor ? node.ownerColor : "#868686";

    // Outline if this node is the currently selected "from" node
    const isFromSelected = node.id === selectedFromNode;
    const isToSelected = node.id === selectedToNode;

    return (
      <React.Fragment key={node.id}>
        <circle
          cx={x}
          cy={y}
          r={20}
          fill={fillColor}
          stroke={isFromSelected ? "yellow" : isToSelected ? "yellow" : "black"}
          strokeWidth={isFromSelected ? 4 : 2}
          onClick={() => handleNodeClick(node.id)}
          style={{ cursor: "pointer" }}
        />
        <text
          x={x}
          y={y + 5}
          textAnchor="middle"
          fontSize={14}
          fill="#171717"
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
          {/* Red Blue Cyan Purple Green Pink */}
          {["#f52900", "#5454ff", "#00ccf5", "#7b00f5", "#258030", "#e900f5"].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                backgroundColor: c,
                width: "30px",
                height: "42px",
                margin: "0 5px",
                border: color === c ? "3px solid #000" : "2px solid #aaa",
                borderRadius: "50%",
                cursor: "pointer",
                display: "inline-block",
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={handleJoinGame}
            style={{
              padding: "10px 20px",
              backgroundColor: color,
              color: "#171717",
              border: color === "#171717" ? "3px solid #171717" : "3px solid #171717",
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
    statusMessage = "";
  }

return (
  <div style={{ textAlign: "center" }}>
    <h2>Untitled Graph Game</h2>
    <p>{statusMessage}</p>

    {gameState ? (
      <>
        <svg width={400} height={400} style={{ border: "1px solid black" }}>
          {renderEdges()}
          {renderNodes()}
        </svg>

        {/* Troop modification UI and node selection details below the game */}
        {gameStarted && (
           <div style={{ marginTop: "1rem" }}>
          {/* Main troop sending button */}
          <div>
            <button
              style={{
                padding: "10px 30px", // Larger padding for a bigger button
                fontSize: "20px", // Larger font size for text
                marginRight: "10px",
              }}
              onClick={handleSendTroops}
            >
              Send {troopAmount} Troops
            </button>
          </div>
            {/* Troop increment buttons */}
            <div style={{ marginTop: "10px" }}>
              <button
                style={{ marginRight: "5px", padding: "5px 10px" }}
                onClick={() => setTroopAmount((prev) => Math.min(prev + 5, MAX_TROOPS_TO_SEND))}
              >
                +5
              </button>
              <button
                style={{ marginRight: "5px", padding: "5px 10px" }}
                onClick={() => setTroopAmount((prev) => Math.min(prev + 10, MAX_TROOPS_TO_SEND))}
              >
                +10
              </button>
              <button
                style={{ marginRight: "5px", padding: "5px 10px" }}
                onClick={() => setTroopAmount((prev) => Math.min(prev + 25, MAX_TROOPS_TO_SEND))}
              >
                +25
              </button>
              <button
                style={{ marginRight: "5px", padding: "5px 10px" }}
                onClick={() => setTroopAmount((prev) => Math.min(prev + 50, MAX_TROOPS_TO_SEND))}
              >
                +50
              </button>
              <button
                style={{ padding: "5px 10px" }}
                onClick={() => setTroopAmount(10)}
              >
                Clear
              </button>
            </div>

            {/* Sending and receiving node details */}
            <div style={{ marginTop: "10px" }}>
              <p>Sending node selected: {selectedFromNode ?? "None"}</p>
              <p>Receiving node selected: {selectedToNode ?? "None"}</p>
            </div>
          </div>
        )}
      </>
    ) : (
      <p>Loading game state...</p>
    )}
  </div>
  );
}

export default App;