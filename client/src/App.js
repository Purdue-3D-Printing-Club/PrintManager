import React, { useState, useEffect } from 'react';
import './App.css';
import Axios from 'axios'

function App() {
  
  const [printerName, setPrinterName] = useState('');
  const [printerBrand, setPrinterBrand] = useState('');
  const [printerList, setPrinterList] = useState([]);
  const [updatePrinterVals, setUpdatePrinterVals] = useState({});

  useEffect(()=> {
    Axios.get('http://localhost:3001/api/get').then((response) => {
      setPrinterList(response.data);
    });
  }, []);

  const submitReview = () => {
    if (printerName === "") {
      return;
    }
    Axios.post('http://localhost:3001/api/insert', {
        printerName: printerName,
       printerBrand: printerBrand
      }).then(() => {
        setPrinterList([...printerList, {printerName: printerName, brand: printerBrand}]);
        setPrinterName('');
        setPrinterBrand('');
      }).catch(error => {
        console.error('Error submitting review: ', error);
      });
  };

  const deletePrinter = (name) => {
    try {
      Axios.delete(`http://localhost:3001/api/delete/${name}`);
      setPrinterList(printerList.filter(printer => printer.printerName !== name));
    } catch (error) {
      console.error("Error deleting printer: ", error);
    }
  }

  const updatePrinter = (name) => {
    try {
    Axios.put('http://localhost:3001/api/update', {
      printerName: name,
      printerBrand: updatePrinterVals[name]
    });
    const updatedPrinterList = printerList.map(printer => {
      if (printer.printerName === name) {
        return {...printer, brand: updatePrinterVals[name]};
      }
      return printer;
    });
    setPrinterList(updatedPrinterList);
    setUpdatePrinterVals({...updatePrinterVals, [name]: ""});
  } catch (error) {
    console.error("Error updating printer: ", error);
  }
  };

  return (
    <div className="App">
      <h1>--Print Manager--</h1>
      <div className="form">
        <label>Printer Name:</label>
        <input type="text" name="printerName" value={printerName} onChange={(e) => {
          setPrinterName(e.target.value);
        }}/>

        <label>Brand:</label>
        <input type="text" name="printerBrand" value={printerBrand} onChange={(e) => {
          setPrinterBrand(e.target.value);
        }}/>

        <button onClick={submitReview}>Submit</button>
        {printerList.map(val => {
          return <div className="printerCard" key={val.printerName}>
              <h1>{val.printerName}</h1> 
                <p>Printer Brand: {val.brand}</p>
                <button onClick={() => {deletePrinter(val.printerName)}}>Delete</button>
                <input id="updateInput" type="text" value={updatePrinterVals[val.printerName] || ""} onChange={(e) => {
                  setUpdatePrinterVals({...updatePrinterVals, [val.printerName]: e.target.value})
                  }}/>
                <button onClick={() => {updatePrinter(val.printerName)}}>Update</button>
              </div>
        })}
      </div>
    </div>
  );
}

export default App;
