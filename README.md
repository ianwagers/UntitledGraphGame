# Graph RTS Tycoon (Working Title)

A real-time, graph-based multiplayer game where players control nodes, upgrade them to increase troop generation, and send troops to adjacent nodes. Designed for “hybrid” play: a main display (TV/PC monitor) plus mobile browsers as controllers.

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

- **Short Match Duration:** Designed for quick 10–30 minute sessions.
- **Real-Time Gameplay:** Troops grow over time; players can upgrade nodes or send troops to adjacent nodes.
- **Multiplatform Access:** Host on a local server; each player joins via mobile browser (similar to Jackbox games).
- **Future Expandability:** Could be expanded with more nodes, advanced upgrades, or different map layouts.

---

## Features

1. **Node Ownership and Troop Growth**
   - Each node starts with a population of 1 and grows +1 troop per second.
   - Upgrades increase growth rate by 1.5x (upgrade cost starts at 50 troops, increasing by 25 each time).

2. **Sending Troops**
   - Players can send any number ≥10 troops to an adjacent node.
   - Troops arriving at an unoccupied node or a node owned by another player will attempt to capture it. The highest troop sender wins if multiple players target the same node.

3. **Multiple Players**
   - Supports 2–4 players now, with potential to expand up to 10 in the future.
   - All clients see updates in real time via Socket.IO.

4. **Easy Setup**
   - Quick local hosting. Run `npm install` and `npm start` on your machine; other players connect via `http://<your-ip>:<port>` from their phones.

---

## Tech Stack

- **Language:** TypeScript (both server and client)
- **Server Runtime:** Node.js
- **Real-Time Framework:** Socket.IO
- **Web Framework:** Express (or NestJS if preferred)
- **Front-End Options:**
  - React + 2D rendering (PixiJS, D3, or similar), **or**
  - Phaser for a more “game-engine” feel
- **Dev Environment:** Visual Studio Code

---

## Project Structure

A possible directory layout (adjust as needed):

\`\`\`
graph-rts-tycoon/
├── server/
│   ├── src/
│   │   ├── index.ts           // Entry point for the server
│   │   ├── gameLogic.ts       // Game loop, troop growth, node management
│   │   └── routes.ts          // Express routes (if any)
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── App.tsx            // React entry (if using React)
│   │   ├── components/        // UI components
│   │   └── socket.ts          // Socket.IO client-side setup
│   ├── public/
│   │   └── index.html         // Main HTML file
│   ├── package.json
│   └── tsconfig.json
├── shared/
│   └── types.ts               // Shared interfaces/enums (NodeState, Player, etc.)
└── README.md
\`\`\`

---

## Setup

1. **Clone the Repository**  
   \`\`\`bash
   git clone https://github.com/yourusername/graph-rts-tycoon.git
   cd graph-rts-tycoon
   \`\`\`

2. **Install Dependencies**  
   - For the server:
     \`\`\`bash
     cd server
     npm install
     \`\`\`
   - For the client:
     \`\`\`bash
     cd ../client
     npm install
     \`\`\`

3. **Configure Environment**  
   - Create a \`.env\` file in \`server/\` if needed (port, etc.).
   - By default, you can hard-code \`PORT=3000\` or similar.

---

## Usage

1. **Start the Server**  
   \`\`\`bash
   cd server
   npm run dev
   \`\`\`
   - This will run the server in watch mode (using \`ts-node-dev\` or \`nodemon\` if configured).

2. **Start the Front-End**  
   \`\`\`bash
   cd client
   npm start
   \`\`\`
   - Opens the front-end in development mode at \`http://localhost:3000\` (or another port if configured).

3. **Connect with Mobile Devices**  
   - Ensure devices are on the same local network.
   - On each device, open \`http://<your-IP>:<port>\` (e.g., \`http://192.168.0.10:3000\`).

4. **Play**  
   - The “host” display (TV/monitor) shows the main game view (nodes, troop counts).  
   - Each player’s phone has the interface for sending troops, upgrading, etc.  

---

## Roadmap

- [ ] **MVP**: Basic node ownership and troop generation.  
- [ ] **UI Polish**: Better visuals for troop movement and upgraded nodes.  
- [ ] **Lobby System**: Let players join, pick a color, and see a waiting screen before the game starts.  
- [ ] **Advanced Upgrades**: Different upgrade tiers, node specialization, etc.  
- [ ] **Scalability**: Move to a cloud server for easier remote play, add database if needed.

---

## License

This project is licensed under the [MIT License](LICENSE), which allows for commercial and non-commercial use, modification, and distribution.

---

**Happy coding and have fun building your real-time graph RTS/tycoon game!**
