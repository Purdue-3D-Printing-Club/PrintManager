import React, { useState, useEffect } from 'react';
import './App.css';
import Axios from 'axios'
import Sidebar from './Sidebar';
import Menu from './Menu'

function App() {
  const [filamentUsage, setFilamentUsage] = useState('');
  const [gcode, setgcode] = useState('');

  const [selectedPrinter, selectPrinter] = useState(null);
  const [selectedFilament, selectFilament] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);

  const [printerName, setPrinterName] = useState('');
  const [printerBrand, setPrinterBrand] = useState('');

  const [printerList, setPrinterList] = useState([]);
  const [filamentList, setFilamentList] = useState([]);

  const [updatePrinterVals, setUpdatePrinterVals] = useState({});

  const [message, setMessage] = useState('');
  const [showErr, setShowErr] = useState(false);
  const [showMsg, setShowMsg] = useState(false);

  useEffect(() => {
    try {
      Axios.get('http://localhost:3001/api/get').then((response) => {
        console.log(response);
        console.log("setting printers to data: ", response.data.printers);
        console.log("setting filament to data: ", response.data.filament);
        setPrinterList(response.data.printers);
        setFilamentList(response.data.filament);
      });
    } catch (error) {
      console.error("Error fetching printer data: ", error);
    }
  }, []);


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

  const handleStartPrintClick = () => {
    //check for empty values
    if (gcode === "") {
      console.log("startPrintClick: err: no gcode");
      showErrForDuration("No GCODE! Print not started.", 3000);
    } else if ((filamentUsage === 0) || (filamentUsage === "")) {
      console.log("startPrintClick: err: no filamentUsage");
      showErrForDuration("No filament usage! Print not started.", 3000);
     } else if (selectedFilament === null) {
      console.log("startPrintClick: err: no filament selected");
      showErrForDuration("No filament selected! Print not started.", 3000);
     } else if (selectedPrinter === null) {
      console.log("startPrintClick: err: no printer selected");
      showErrForDuration("No printer selected! Print not started.", 3000);
    } else if (selectedPrinter.status !== "available") {
      console.log("startPrintClick: selected printer is not available!");
      showErrForDuration(`Printer ${selectedPrinter.printerName} is not available! Print not started.`, 3000);
    } else {
      //all fields have valid values, insert the print to the "printJob" table
      console.log("startPrintClick: all fields valid, inserting to printJob");
      
      try {
        Axios.post('http://localhost:3001/api/insert', {
          printerName: selectedPrinter.printerName,
          gcode: gcode,
          usage_g: filamentUsage,
         // timeStarted: new Date(),
          filamentIDLoaded: selectedFilament.filamentID
        });
      } catch (error) {
        console.error('Error submitting printJob: ', error);
      }
      
      //also clear the fields of the text input and filament selected (leave printer selected as is)
      setFilamentUsage('');
      setgcode('');
      selectFilament(null);

      //close error message if its still open
      setShowErr(false);

      showMsgForDuration(`Print job successfully started!`, 3000);
    }
  }

  const showErrForDuration = (msg, duration) => {
    if (!showErr && !showMsg) {
      setMessage(msg);
      setShowErr(true);
      setTimeout(() => {
        setShowErr(false);
      }, duration);
    }
  };
  const showMsgForDuration = (msg, duration) => {
    if (!showMsg) {
      setMessage(msg);
      setShowMsg(true);
      setTimeout(() => {
        setShowMsg(false);
      }, duration);
    }
  };

  const handlePrinterClick = (printer) => {
    selectPrinter(printer);
    console.log("selected printer: " + printer.printerName);
  };

  const handleFilamentClick = (filament) => {
    selectFilament(filament);
    console.log("selected filament: " + filament.filamentID);
  };

  const handlegcode = (e) => {
    const gcode = e.target.value;
    setgcode(gcode);
    console.log("set gcode to "+gcode);
  }
  const handleFilamentUsage = (e) => {
    const usage = e.target.value.replace(/\D/g, "");
    setFilamentUsage(usage);
    console.log("set filament usage to "+usage);
  }
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
      <Sidebar printerList={printerList} handlePrinterClick={handlePrinterClick} selectedPrinter={selectedPrinter} 
               handleOpenMenu={handleOpenMenu} menuOpen={menuOpen}/>
      <div className='main-content'>
        <div className="header">
          <h1>CS348 Test Lab - Print Manager</h1>
        </div>
        
        {menuOpen ? (
          <div className='menuBG active'>
            <Menu menuOpen={menuOpen} filamentList={filamentList} selectedFilament={selectedFilament} 
                  handleFilamentClick={handleFilamentClick} selectedPrinter={selectedPrinter}
                  handleFilamentUsage={handleFilamentUsage} filamentUsage={filamentUsage}
                  handlegcode={handlegcode} gcode={gcode} handleStartPrintClick={handleStartPrintClick}></Menu>
          </div>
        ) :
        (
          <div className='menuBG hidden'>
            <Menu menuOpen={menuOpen} filamentList={filamentList} selectedFilament={selectedFilament} 
                  handleFilamentClick={handleFilamentClick} selectedPrinter={selectedPrinter}
                  handleFilamentUsage={handleFilamentUsage} filamentUsage={filamentUsage}
                  handlegcode={handlegcode} gcode={gcode} handleStartPrintClick={handleStartPrintClick}></Menu>
          </div>
        )}

        {showErr && menuOpen && <div className="err-msg">{message}</div>}
        {showMsg && menuOpen && <div className="success-msg">{message}</div>}

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

          <button>Submit</button>
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
