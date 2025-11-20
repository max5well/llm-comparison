# LLM Compare Frontend

Modern React TypeScript frontend for the LLM Performance Comparison Platform.

## Features

- **Modern UI/UX**: Built with React, TypeScript, and Tailwind CSS
- **Workspace Management**: Create and manage RAG evaluation workspaces
- **Document Upload**: Upload and process documents (PDF, DOCX, TXT)
- **Evaluation Creation**: Configure and run multi-model comparisons
- **Results Visualization**: Interactive charts and detailed result views
- **Responsive Design**: Works seamlessly on desktop and mobile

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Lucide React** - Icon library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on http://localhost:8000

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to http://localhost:3000

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Layout.tsx
│   │   └── LoadingSpinner.tsx
│   ├── pages/           # Page components
│   │   ├── Login.tsx
│   │   ├── Home.tsx
│   │   ├── Workspaces.tsx
│   │   ├── CreateWorkspace.tsx
│   │   ├── WorkspaceDetail.tsx
│   │   ├── CreateEvaluation.tsx
│   │   └── Results.tsx
│   ├── services/        # API client
│   │   └── api.ts
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config
└── tailwind.config.js   # Tailwind config
```

## API Integration

The frontend communicates with the backend API through the `api` service located in `src/services/api.ts`. The Vite dev server proxies `/api` requests to `http://localhost:8000`.

### Authentication

The app uses a simple API key authentication:

1. Sign up with an email to get an API key
2. API key is stored in localStorage
3. All subsequent requests include the user_id parameter

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Key Features

### 1. Workspace Management
- Create workspaces with custom embedding configurations
- View and manage all workspaces
- Configure chunk size and overlap

### 2. Document Processing
- Upload documents (PDF, DOCX, TXT)
- Process documents to generate embeddings
- View document status and chunks

### 3. Dataset Management
- Create test datasets
- Upload JSONL files with questions
- Generate synthetic questions (future feature)

### 4. Evaluation
- Select multiple models to compare
- Choose judge model for evaluation
- Real-time evaluation status

### 5. Results Dashboard
- Win rate and quality scores
- Performance metrics (latency, cost, tokens)
- Interactive charts and visualizations
- Detailed question-by-question results

## Customization

### Styling

Edit `tailwind.config.js` to customize the design system:

```js
theme: {
  extend: {
    colors: {
      primary: {
        // Your custom color palette
      },
    },
  },
}
```

### API Endpoint

To change the backend API URL, update `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://your-backend-url',
      changeOrigin: true,
    }
  }
}
```

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure the backend has the frontend URL in its allowed origins.

### API Connection

Verify the backend is running on http://localhost:8000 and accessible.

### Build Errors

Clear node_modules and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - see LICENSE file for details
