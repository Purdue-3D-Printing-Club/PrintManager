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
  const [usingFilament, setUsingFilament] = useState([]);

  const [printerBrands, setPrinterBrands] = useState({});

  const [message, setMessage] = useState('');
  const [showErr, setShowErr] = useState(false);
  const [showMsg, setShowMsg] = useState(false);

  useEffect(() => {
    try {
      Axios.get('http://localhost:3001/api/get').then((response) => {
        console.log(response);
        console.log("setting printers to data: ", response.data.printers);
        console.log("setting filament to data: ", response.data.filament);

        //process usingFilament into integer array
        const usingFilamentArr = response.data.usingFilament.map(obj => obj.filamentIDLoaded);

        console.log("currently using filament: ", usingFilamentArr);
        setPrinterList(response.data.printers);
        setFilamentList(response.data.filament);
        setUsingFilament(usingFilamentArr);
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

  const updatePrinterBrand = (name) => {
    try {
      Axios.put('http://localhost:3001/api/update', {
        table: "printer",
        column: "brand",
        id: name,
        val: printerBrands[name]
      });
      const updatedPrinterList = printerList.map(printer => {
        if (printer.printerName === name) {
          return { ...printer, brand: printerBrands[name] };
        }
        return printer;
      });
      setPrinterList(updatedPrinterList);
      setPrinterBrands({ ...printerBrands, [name]: "" });
    } catch (error) {
      console.error("Error updating printer: ", error);
    }
  };

  const updatePrinter = (column1, id, val, callback) => {
    try {
      Axios.put('http://localhost:3001/api/update', {
        table: "printer",
        column: column1,
        id: id,
        val: val
      }).then(() => {
        const updatedPrinterList = printerList.map(printer => {
          if (printer.printerName === selectedPrinter.printerName) {
            console.log(`updating local printer '${printer.printerName}''s ${column1} field to ${val}... it has status ${printer.status}`);
            return { ...printer, [column1]: val };
          }
          return printer;
        });
        setPrinterList(updatedPrinterList);
        if (typeof callback === 'function') {
          callback();
        }
        
      });
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
          timeStarted: new Date().toISOString(),
          filamentIDLoaded: selectedFilament.filamentID
        }).then(() => {
          //update the current job of the printer that was selected for the print
          try {
            Axios.get(`http://localhost:3001/api/getCurrentJob?printerName=${selectedPrinter.printerName}`).then((response) => {
              //update the printer status of the printer that was given the job
              updatePrinter("status", selectedPrinter.printerName, "busy", () => {
                //update the currentJob of the printer that was used for the printJob
                updatePrinter("currentJob", selectedPrinter.printerName, response.data.currentJob[0].jobID, () => {
                  const updatedPrinterList = printerList.map(printer => {
                    if (printer.printerName === selectedPrinter.printerName) {
                      console.log(`updating local printer '${printer.printerName}''s status field to busy... it has status ${printer.status}`);
                      return { ...printer, status: "busy" };
                    }
                    return printer;
                  });
                  setPrinterList(updatedPrinterList);
                });
              });  
            });
          } catch (error) {
            console.error("Error fetching printer data: ", error);
          }

        });
      } catch (error) {
        console.error('Error submitting printJob: ', error);
      }

      

      //add the used filament to the usingFilamentList to prevent it from being used again
      usingFilament.push(selectedFilament.filamentID);



      //lastly, clear the fields of the text input and filament selected
      setFilamentUsage('');
      setgcode('');
      selectFilament(null);
      selectPrinter(null);

      //close error message if its still open
      setShowErr(false);

      showMsgForDuration(`Print job successfully started!`, 3000);
    }
  };

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
    if (selectedPrinter === printer) {
      selectPrinter(null);
      console.log("unselected printer: " + printer.printerName);
    } else {
      selectPrinter(printer);
      console.log("selected printer: " + printer.printerName);
    }
  };

  const handleFilamentClick = (filament) => {
    if (!usingFilament.includes(filament.filamentID)) {
      if (selectedFilament === filament) {
        selectFilament(null);
        console.log("unselected filament: " + filament.filamentID);
      } else {
        selectFilament(filament);
        console.log("selected filament: " + filament.filamentID);
      }
    }
  };

  const handlegcode = (e) => {
    const gcode = e.target.value;
    setgcode(gcode);
    console.log("set gcode to " + gcode);
  };

  const handleFilamentUsage = (e) => {
    const usage = e.target.value.replace(/\D/g, "");
    setFilamentUsage(usage);
    console.log("set filament usage to " + usage);
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
      <Sidebar printerList={printerList} handlePrinterClick={handlePrinterClick} selectedPrinter={selectedPrinter}
        handleOpenMenu={handleOpenMenu} menuOpen={menuOpen} />
      <div className='main-content'>
        <div className="header">
          <h1>CS348 Test Lab - Print Manager</h1>
        </div>

        {menuOpen ? (
          <div className='menuBG active'>
            <Menu menuOpen={menuOpen} filamentList={filamentList} selectedFilament={selectedFilament}
              handleFilamentClick={handleFilamentClick} selectedPrinter={selectedPrinter}
              handleFilamentUsage={handleFilamentUsage} filamentUsage={filamentUsage}
              handlegcode={handlegcode} gcode={gcode} handleStartPrintClick={handleStartPrintClick}
              usingFilament={usingFilament}></Menu>
          </div>
        ) :
          (
            <div className='menuBG hidden'>
              <Menu menuOpen={menuOpen} filamentList={filamentList} selectedFilament={selectedFilament}
                handleFilamentClick={handleFilamentClick} selectedPrinter={selectedPrinter}
                handleFilamentUsage={handleFilamentUsage} filamentUsage={filamentUsage}
                handlegcode={handlegcode} gcode={gcode} handleStartPrintClick={handleStartPrintClick}
                usingFilament={usingFilament}></Menu>
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
              <input id="updateInput" type="text" value={printerBrands[printer.printerName] || ""} onChange={(e) => {
                setPrinterBrands({ ...printerBrands, [printer.printerName]: e.target.value })
              }} />
              <button onClick={() => { updatePrinterBrand(printer.printerName) }}>Update</button>
            </div>
          })}
        </div>

      </div>

    </div>
  );
}

export default App;
