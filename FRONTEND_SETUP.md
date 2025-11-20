# Frontend Setup Guide

## Quick Start

The frontend has been created with all necessary files. To get started:

### Option 1: Using npm (Recommended)

```bash
cd frontend

# If you encounter npm cache errors, run:
npm cache clean --force

# Then install dependencies:
npm install

# Start the development server:
npm run dev
```

The frontend will be available at http://localhost:3000

### Option 2: Using yarn

If npm continues to have issues, you can use yarn instead:

```bash
cd frontend

# Install yarn if you don't have it:
npm install -g yarn

# Install dependencies:
yarn install

# Start the development server:
yarn dev
```

## Troubleshooting

### npm cache errors (EACCES, EEXIST)

If you see npm cache permission errors:

```bash
# Option 1: Clean cache with sudo
sudo npm cache clean --force
npm install

# Option 2: Fix npm permissions
sudo chown -R $(whoami) ~/.npm
npm cache clean --force
npm install

# Option 3: Use yarn instead
npm install -g yarn
yarn install
```

### Port 3000 already in use

If port 3000 is already taken, you can change it in `vite.config.ts`:

```ts
server: {
  port: 3001,  // Change to any available port
  // ...
}
```

## What's Included

The frontend includes:

- ✅ Modern React + TypeScript setup with Vite
- ✅ Tailwind CSS for styling
- ✅ React Router for navigation
- ✅ Axios API client with TypeScript types
- ✅ Authentication (signup/login)
- ✅ Workspace management
- ✅ Document upload and processing
- ✅ Evaluation creation and configuration
- ✅ Results dashboard with charts (Recharts)
- ✅ Responsive design for mobile and desktop
- ✅ Loading states and error handling

## Running the Full Stack

1. **Start the backend** (in one terminal):
```bash
cd backend
# Follow backend setup instructions (Docker or local)
```

2. **Start the frontend** (in another terminal):
```bash
cd frontend
npm run dev
```

3. **Open your browser** to http://localhost:3000

## Building for Production

```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/` and can be served with any static file server.

## Testing the Application

1. Navigate to http://localhost:3000
2. Sign up with your email to get an API key
3. Create a workspace with your preferred embedding settings
4. Upload documents (PDF, DOCX, or TXT)
5. Process the documents to generate embeddings
6. Create a test dataset (or upload JSONL)
7. Run an evaluation comparing different LLMs
8. View results with interactive charts and detailed breakdowns

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality

## Next Steps

After getting the frontend running:

1. **Customize the styling**: Edit `tailwind.config.js` to match your brand
2. **Add more features**: The codebase is well-structured for extensions
3. **Configure the backend URL**: Update `vite.config.ts` if your backend is not on localhost:8000
4. **Deploy**: Build and deploy to Vercel, Netlify, or any static hosting

## Support

If you encounter any issues:

1. Check that Node.js version is 18 or higher: `node --version`
2. Ensure the backend is running and accessible
3. Check browser console for errors
4. Verify CORS is properly configured on the backend
