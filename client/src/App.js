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


  const [printerList, setPrinterList] = useState([]);
  const [filamentList, setFilamentList] = useState([]);
  const [usingFilament, setUsingFilament] = useState([]);

  const [message, setMessage] = useState('');
  const [showErr, setShowErr] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [showWarn, setShowWarn] = useState(false);

  //Printer menu data
  const [statMessage, setStatMessage] = useState("");
  const [filamentLoaded, setFilamentLoaded] = useState(null);
  const [historyList, setHistoryList] = useState([]);

  //fill data arrays on the initial render
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

  //update the printer screen when selectedPrinter changes
  useEffect(() => {
    //Update the data that is shown
    if (selectedPrinter !== null) {
      //get data from the database
      try {
        Axios.get(`http://localhost:3001/api/getgcode?jobID=${selectedPrinter.currentJob}`).then((response) => {
          if (response.data.res[0] && (selectedPrinter.status === "busy")) {
            setStatMessage("This printer is busy printing: " + response.data.res[0].gcode);
            filamentList.map(filament => {
              if (filament.filamentID === response.data.res[0].filamentIDLoaded) {
                console.log(filament);
                setFilamentLoaded(filament);
              }
              return 0;
            });
          }
        });

        Axios.get(`http://localhost:3001/api/getHistory?printerName=${selectedPrinter.printerName}`).then((response) => {
          setHistoryList(response.data.historyList.sort((a, b) => new Date(b.timeStarted) - new Date(a.timeStarted)));
        });

      } catch (error) {
        console.error("Error fetching printer data: ", error);
      }
      //update the stat message
      switch (selectedPrinter.status) {
        case "available":
          setStatMessage("This printer is available!");
          setFilamentLoaded(null);
          break;
        case "busy":
          //its already done above
          break;
        case "broken":
          setStatMessage("This printer is broken.. (0_0)");
          setFilamentLoaded(null);
          break;
        default:
      }
    }
  }, [selectedPrinter, filamentList]);

  /*const deletePrinter = (name) => {
    try {
      Axios.delete(`http://localhost:3001/api/delete/${name}`);
      setPrinterList(printerList.filter(printer => printer.printerName !== name));
    } catch (error) {
      console.error("Error deleting printer: ", error);
    }
  };*/

  const updateTable = (table, column1, id, val, callback) => {
    try {
      Axios.put('http://localhost:3001/api/update', {
        table: table,
        column: column1,
        id: id,
        val: val
      }).then(() => {
        if (typeof callback === 'function') {
          callback();
        }
      });
    } catch (error) {
      console.error("Error updating printer: ", error);
    }
  };

  const handlePrinterStatusChange = (statusArg) => {
    //first, update the database to have the new printer status
    updateTable("printer", "status", selectedPrinter.printerName, statusArg, () => {
      //then, update the local printer array to reflect this change
      const updatedPrinterList = printerList.map(printer => {
        if (printer.printerName === selectedPrinter.printerName) {
          return { ...printer, status: statusArg };
        }
        return printer;
      });
      setPrinterList(updatedPrinterList);
      selectPrinter(null);
    });
  };

  const printerBroke = () => {
    handlePrintDoneClick("failed", () => {
      handlePrinterStatusChange("broken");
    });

  };

  const updateFilamentUsage = (filamentID, amount, callback) => {
    //first, get the filament's current amount
    const matchingFilament = filamentList.find(filament => filamentID === filament.filamentID);

    let g_left = 0;
    if (matchingFilament) {
      g_left = matchingFilament.amountLeft_g;
    }
    console.log("g_left: " + g_left + ", amount: " + amount);
    //then, update the database with the new amount by subtracting the amount OR delete the filament if it is empty.
    let new_amount = g_left - amount;
    if (new_amount < 0) {
      new_amount = 0;
    }
    //update the amount
    console.log("updating the filament amountLeft_g value");
    updateTable("filament", "amountLeft_g", filamentID, new_amount, () => {
      //then, reflect the change on the local filamentList
      const updatedFilamentList = filamentList.map(filament => {
        if (filament.filamentID === filamentID) {
          return { ...filament, amountLeft_g: new_amount };
        }
        return filament;
      });
      setFilamentList(updatedFilamentList);

      if (typeof callback === 'function') {
        callback();
      }
    });
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
    } else if (filamentUsage > selectedFilament.amountLeft_g) {
      console.log("startPrintClick: filamentUsage exceeds the amount left on the selected spool!");
      showWarningForDuration(`Not enough filament remaining on spool #${selectedFilament.filamentID}! (${filamentUsage}g > ${selectedFilament.amountLeft_g}g).`, 5000);
    } else {
      //all fields have valid values, insert the print to the "printJob" table
      console.log("startPrintClick: all fields valid, inserting to printJob");
      startPrint();
  };
};
  const handleWarningClick = () => {
    setShowWarn(false);
    startPrint();
  }

  const startPrint = () => {
    try {
      Axios.post('http://localhost:3001/api/insert', {
        printerName: selectedPrinter.printerName,
        gcode: gcode,
        usage_g: filamentUsage,
        timeStarted: new Date().toISOString(),
        filamentIDLoaded: selectedFilament.filamentID,
        status: "active"
      }).then(() => {
        //update the current job of the printer that was selected for the print
        try {
          Axios.get(`http://localhost:3001/api/getCurrentJob?printerName=${selectedPrinter.printerName}`).then((response) => {
            console.log("CurrentJob data: ");
            console.log(response.data);
            //update the printer status of the printer that was given the job
            updateTable("printer", "status", selectedPrinter.printerName, "busy", () => {
              //update the currentJob of the printer that was used for the printJob
              updateTable("printer", "currentJob", selectedPrinter.printerName, response.data.currentJob[0].jobID, () => {
                const updatedPrinterList = printerList.map(printer => {
                  if (printer.printerName === selectedPrinter.printerName) {
                    return { ...printer, status: "busy", currentJob: response.data.currentJob[0].jobID };
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
  };

  const handlePrintDoneClick = (statusArg, callback) => {
    try {
      console.log("print done was clicked... setting printer status to available");
      //set status to available
      updateTable("printer", "status", selectedPrinter.printerName, "available", () => {

        //set the printJob status to statusArg
        console.log("now setting printjob status to statusArg...");
        Axios.put('http://localhost:3001/api/update', {
          table: "printjob",
          column: "status",
          id: selectedPrinter.currentJob,
          val: statusArg
        }).then(() => {
          //remove currentJob
          console.log("removing printer's currentJob...");
          updateTable("printer", "currentJob", selectedPrinter.printerName, "", () => {

            //get the filamentID with the job 
            console.log("getting printJob's filamentID...");
            Axios.get(`http://localhost:3001/api/getgcode?jobID=${selectedPrinter.currentJob}`).then((response) => {
              console.log("filamentID response: ");
              console.log(response.data);
              if (response.data.res[0]) {

                //update the filament usage
                console.log("updating the filament usage for that filament...");
                updateFilamentUsage(response.data.res[0].filamentIDLoaded, response.data.res[0].usage_g, () => {

                  //apply the changes locally
                  const updatedPrinterList = printerList.map(printer => {
                    if (printer.printerName === selectedPrinter.printerName) {
                      return { ...printer, status: "available", currentJob: "" };
                    }
                    return printer;
                  });
                  setPrinterList(updatedPrinterList);

                  //remove the filament from the used array locally
                  const updatedUsingFilament = usingFilament.filter(filamentID => filamentID !== response.data.res[0].filamentIDLoaded);
                  setUsingFilament(updatedUsingFilament);

                  if (typeof callback === 'function') {
                    callback();
                  }
                  selectPrinter(null);
                  console.log("Print finished, done updating the database.");
                });
              }
            });
          });
        });
      });
    } catch (error) {
      console.error("Error updating printer: ", error);
    }
  };

  const showErrForDuration = (msg, duration) => {
    setShowWarn(false);
    setShowMsg(false);
    if (!showErr) {
      setMessage(msg);
      setShowErr(true);
      setTimeout(() => {
        setShowErr(false);
      }, duration);
    }
  };
  const showWarningForDuration = (msg, duration) => {
    setShowErr(false);
    setShowMsg(false);
    if (!showWarn) {
      setMessage(msg);
      setShowWarn(true);
      setTimeout(() => {
        setShowWarn(false);
      }, duration);
    }
  };

  const showMsgForDuration = (msg, duration) => {
    setShowWarn(false);
    setShowErr(false);
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
      console.log("unselected printer: ");
      console.log(printer);
    } else {
      selectPrinter(printer);
      console.log("selected printer: ");
      console.log(printer);
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

  function formatDate(isoString) {
    const date = new Date(isoString);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours() % 12 || 12).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const amOrPm = date.getHours() >= 12 ? 'PM' : 'AM';
    return `${mm}/${dd}/${yyyy} ${hh}:${min} ${amOrPm}`;
  }

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
        {showWarn && menuOpen && <div className="warning-msg">
          <div className="warning-content">
            {message}<br></br>Continue anyway?
            <div onClick={() => { handleWarningClick() }} style={{backgroundColor: "rgb(118, 152, 255)"}} className='printer-btn'>Continue</div>
          </div>
        </div>}

        <div style={{ height: '110px' }}></div>

        <div className="printer-screen">
          {(!selectedPrinter && !menuOpen) && <div className='null'>
            No printer selected! <br></br>Choose one from the printer list on the left.
          </div>}

          {selectedPrinter && !menuOpen && <div>
            <div className='printer-header'>
              {selectedPrinter.printerName} - {selectedPrinter.model}
            </div>
            <div style={{ height: "60px" }}></div>
            <div className='stat-msg'>{statMessage}</div>
            {filamentLoaded && !menuOpen && <div className='filament-msg'>
              Using filament #{filamentLoaded.filamentID}: {filamentLoaded.brand} {filamentLoaded.material} - {filamentLoaded.color} - {filamentLoaded.amountLeft_g}g left
            </div>}
            <div style={{ height: "5px" }}></div>
            {(selectedPrinter.status === "busy") && <div>
              <div onClick={() => { handlePrintDoneClick("completed", null) }} style={{ backgroundColor: "rgba(100, 246, 100,0.8)" }} className='printer-btn'>Print Done</div>
              <div onClick={() => { handlePrintDoneClick("failed", null) }} style={{ backgroundColor: "rgba(246, 155, 97,0.8)" }} className='printer-btn'>Print Failed</div>
              <div onClick={() => { printerBroke() }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>Printer Broke</div>
            </div>}
            {selectedPrinter && (selectedPrinter.status === "available") && <div>
              <div onClick={() => { handleOpenMenu() }} className='menu-btn'>Open Print Menu</div>
              <div onClick={() => { handlePrinterStatusChange("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>Printer Broke</div>

            </div>}
            {selectedPrinter && (selectedPrinter.status === "broken") && <div>
              <div onClick={() => { handlePrinterStatusChange("available") }} style={{ backgroundColor: "rgba(100, 246, 100,0.8)" }} className='printer-btn'>Printer Fixed</div>
            </div>}
            <div style={{ height: "50px" }}></div>
            <div className="print-history">Print History</div>
            <div className='wrapper-wrapper'>
              <table className='history-wrapper'>
                <thead>
                  <tr>
                    <th>GCODE Name</th>
                    <th>Time Started</th>
                    <th>Filament Loaded</th>
                    <th>Filament Used (g)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((job) => {
                    let color = "rgb(245,245,245)";
                    if (job.status === "active") {
                      color = "white";
                    } if (job.status === "failed") {
                      color = "rgb(255,240,240)";
                    }

                    return <tr style={{ backgroundColor: color }} key={job.jobID}>
                      <td>{job.gcode}</td>
                      <td>{formatDate(job.timeStarted)}</td>
                      <td>{job.filamentIDLoaded}</td>
                      <td>{job.usage_g}</td>
                      <td>{job.status}</td>
                    </tr>
                  })}
                </tbody>

              </table>
            </div>

          </div>}
        </div>
      </div>
    </div>
  );
}

export default App;
