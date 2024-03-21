import React, { useState, useEffect } from 'react';
import './App.css';
import Axios from 'axios'

function App() {
  
  const [printerName, setPrinterName] = useState('');
  const [printerBrand, setPrinterBrand] = useState('');
  const [printerList, setPrinterList] = useState([]);
  const [updatePrinterVal, setUpdatePrinter] = useState('');

  useEffect(()=> {
    Axios.get('http://localhost:3001/api/get').then((response) => {
      setPrinterList(response.data);
    });
  }, []);

  const submitReview = () => {
    Axios.post('http://localhost:3001/api/insert', {
      printerName: printerName,
       printerBrand: printerBrand
      });
      setPrinterList([...printerList, {printerName: printerName, brand: printerBrand}]);
  };

  const deletePrinter = (name) => {
    Axios.delete(`http://localhost:3001/api/delete/${name}`);
  }

  const updatePrinter = (name) => {
    Axios.put('http://localhost:3001/api/update', {
      printerName: name,
      printerBrand: updatePrinterVal
    });
    setUpdatePrinter("");
  };

  return (
    <div className="App">
      <h1>--Print Manager--</h1>
      <div className="form">
        <label>Printer Name:</label>
        <input type="text" name="printerName" onChange={(e) => {
          setPrinterName(e.target.value);
        }}/>

        <label>Brand:</label>
        <input type="text" name="printerBrand" onChange={(e) => {
          setPrinterBrand(e.target.value);
        }}/>

        <button onClick={submitReview}>Submit</button>
        {printerList.map(val => {
          return <div className="printerCard" key={val.printerName}>
              <h1>{val.printerName}</h1> 
                <p>Printer Brand: {val.brand}</p>
                <button onClick={() => {deletePrinter(val.printerName)}}>Delete</button>
                <input id="updateInput" type="text" onChange={(e) => {setUpdatePrinter(e.target.value)}}/>
                <button onClick={() => {updatePrinter(val.printerName)}}>Update</button>
              </div>
        })}
      </div>
    </div>
  );
}

export default App;
