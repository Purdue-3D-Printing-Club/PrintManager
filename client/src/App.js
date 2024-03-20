
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>--Print Manager--</h1>
      <div className="form">
        <label>Printer Name:</label>
        <input type="text" name="printerName"/>

        <label>Brand:</label>
        <input type="text" name="printerBrand"/>

        <button>Submit</button>
      </div>
      
    </div>
  );
}

export default App;
