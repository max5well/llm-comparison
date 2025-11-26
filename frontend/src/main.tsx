import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

console.log('Starting React app...')

try {
  const root = document.getElementById('root')
  if (!root) {
    console.error('Root element not found!')
  } else {
    console.log('Root element found, mounting React app...')
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    console.log('React app mounted successfully')
  }
} catch (error) {
  console.error('Error mounting React app:', error)
}
