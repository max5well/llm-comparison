import React from 'react';

function App() {
  console.log('App component rendered');

  // Direct DOM manipulation test
  React.useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = '<div><h1>React is Working!</h1><p>If you can see this, React has rendered successfully.</p><button>Click me</button></div>';
    }
  }, []);

  return (
    <div>
      <h1>React is Working!</h1>
      <p>If you can see this, React has rendered successfully.</p>
      <button onClick={() => console.log('Button clicked')}>Click me</button>
    </div>
  );
}

export default App;