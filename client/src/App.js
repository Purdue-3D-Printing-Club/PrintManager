import React, { useState, useEffect } from 'react';
import './App.css';
import Axios from 'axios'
import Sidebar from './Sidebar';
import Menu from './Menu'

function App() {
  const [selectedPrinter, selectPrinter] = useState(null);
  const [selectedFilament, selectFilament] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const [printerName, setPrinterName] = useState('');
  const [printerBrand, setPrinterBrand] = useState('');

  const [printerList, setPrinterList] = useState([]);
  const [filamentList, setFilamentList] = useState([]);

  const [updatePrinterVals, setUpdatePrinterVals] = useState({});

  useEffect(() => {
    try {
      Axios.get('http://localhost:3001/api/get').then((printers) => {
        console.log("setting printers to data: ", printers.data);
        setPrinterList(printers.data);
      });
    } catch (error) {
      console.error("Error fetching printer data: ", error);
    }
  }, []);

  const submitReview = () => {
    if (printerName === "") {
      return;
    }
    try {
      Axios.post('http://localhost:3001/api/insert', {
        printerName: printerName,
        printerBrand: printerBrand
      })
      setPrinterList([...printerList, { printerName: printerName, brand: printerBrand }]);
      setPrinterName('');
      setPrinterBrand('');
    } catch (error) {
      console.error('Error submitting review: ', error);
    }
  };

  const deletePrinter = (name) => {
    try {
      Axios.delete(`http://localhost:3001/api/delete/${name}`);
      setPrinterList(printerList.filter(printer => printer.printerName !== name));
    } catch (error) {
      console.error("Error deleting printer: ", error);
    }
  };

  const updatePrinter = (name) => {
    try {
      Axios.put('http://localhost:3001/api/update', {
        printerName: name,
        printerBrand: updatePrinterVals[name]
      });
      const updatedPrinterList = printerList.map(printer => {
        if (printer.printerName === name) {
          return { ...printer, brand: updatePrinterVals[name] };
        }
        return printer;
      });
      setPrinterList(updatedPrinterList);
      setUpdatePrinterVals({ ...updatePrinterVals, [name]: "" });
    } catch (error) {
      console.error("Error updating printer: ", error);
    }
  };

  const handlePrinterClick = (printer) => {
    selectPrinter(printer);
    console.log("selected printer: " + printer.printerName);
  };
  const handleOpenMenu = () => {
    setMenuOpen(!menuOpen);
    if (!menuOpen) {
      document.body.classList.add('disable-scroll');
    } else {
      document.body.classList.remove('disable-scroll');
    }
    
    console.log("Set menuOpen to: " + menuOpen);
  };

  return (
    <div className="App">
      <Sidebar printerList={printerList} handlePrinterClick={handlePrinterClick} selectedPrinter={selectedPrinter} handleOpenMenu={handleOpenMenu} />
      <div className='main-content'>
        <div className="header">
          <h1>Print Manager</h1>
        </div>
        {menuOpen ? (
          <div className='menuBG active'>
            <Menu menuOpen={menuOpen} filamentList={filamentList}></Menu>
          </div>
        ) :
        (
          <div className='menuBG hidden'>
            <Menu menuOpen={menuOpen} filamentList={filamentList}></Menu>
          </div>
        )}
        <div style={{ height: '110px' }}></div>
        <div className='form'>
          <label>Printer Name:</label>
          <input type="text" name="printerName" value={printerName} onChange={(e) => {
            setPrinterName(e.target.value);
          }} />

          <label>Brand:</label>
          <input type="text" name="printerBrand" value={printerBrand} onChange={(e) => {
            setPrinterBrand(e.target.value);
          }} />

          <button onClick={submitReview}>Submit</button>
          {printerList.map(printer => {
            return <div className="printerCard" key={printer.printerName}>
              <h1>{printer.printerName}</h1>
              <p>Printer Brand: {printer.brand}</p>
              <button onClick={() => { deletePrinter(printer.printerName) }}>Delete</button>
              <input id="updateInput" type="text" value={updatePrinterVals[printer.printerName] || ""} onChange={(e) => {
                setUpdatePrinterVals({ ...updatePrinterVals, [printer.printerName]: e.target.value })
              }} />
              <button onClick={() => { updatePrinter(printer.printerName) }}>Update</button>
            </div>
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
