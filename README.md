# VersionVista

VersionVista is a modern, high-density, timeline-driven Git repository visualization tool. Designed as a web-based IDE, it allows developers to scrub through repository histories, interactively explore historical file trees, and view side-by-side syntax-highlighted diffs across commits in real-time. 

With a sleek, pure black developer-centric interface, VersionVista brings code evolution to life through interactive playbacks and deep commit inspections.

## ✨ Features

- **Interactive Commit Timeline**: Scrub through your repository's history with an interactive slider. Play, pause, and navigate commits chronologically to watch your codebase evolve.
- **Historical File Tree**: The file explorer dynamically updates to reflect the exact state of the repository at the currently selected commit.
- **Line-by-Line Code Diffing**: Instantly view what changed in a file between commits with a detailed, syntax-highlighted inline diff viewer.
- **Local Repository Indexing**: Safely clone or connect local Git repositories. The backend intelligently builds code snapshots using `simple-git` for extremely fast lookup times.
- **Premium Black Aesthetic**: Built with a highly contrastive, true-black aesthetic designed for minimal eye strain and maximum code readability.

## 🏗️ Architecture & Tech Stack

VersionVista is a decoupled full-stack application built with modern web technologies:

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (Custom Black Theme)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (UI State & Timeline Playback) & [TanStack React Query](https://tanstack.com/query/latest) (Data Fetching)
- **Components**: Radix UI / Shadcn UI primitives, Lucide Icons

### Backend
- **Framework**: [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose for storing repo metadata and commit checkpoints)
- **Git Integration**: `simple-git` (For direct interaction with the repository working trees and refs)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas URI
- Git installed on the host machine

### 1. Setup the Backend
Navigate to the backend directory, install dependencies, and start the server:

```bash
cd backend
npm install

# Set up your environment variables
cp .env.example .env
# Ensure your MongoDB URI and PORT are set correctly in .env

npm start
# Server runs on http://localhost:5000 by default
```

### 2. Setup the Frontend
In a new terminal tab, navigate to the frontend directory:

```bash
cd frontend
npm install

npm run dev
# Frontend runs on http://localhost:3000 by default
```

### 3. Usage
1. Open your browser and go to `http://localhost:3000`.
2. Click **Add Repository** in the dashboard.
3. Provide a Git URL or point to a local directory path. The backend will index the repository's commit history.
4. Select the repository to enter the IDE mode and start scrubbing the timeline!

## 📂 Project Structure

```
VersionVista/
├── backend/
│   ├── src/
│   │   ├── modules/       # Domain modules (repo, commit, diff, code_snapshot)
│   │   ├── services/      # Git services interacting with simple-git
│   │   └── server.js      # Express application entry point
│   ├── repos/             # Default directory for cloned/indexed repositories
│   └── package.json
└── frontend/
    ├── src/
    │   ├── app/           # Next.js pages and routing
    │   ├── components/    # Reusable UI components (Timeline, FileTree, CodeViewer)
    │   ├── store/         # Zustand global state stores
    │   └── lib/           # Utility functions and API clients
    └── package.json
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
If you want to contribute to the project, feel free to fork the repository, create a feature branch, and submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
