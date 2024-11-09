import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Axios from 'axios'
import Sidebar from './Sidebar';
import Settings from './Settings';
import { Pie } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import { ReactComponent as ExitIcon } from './images/exit.svg';
import CryptoJS from 'crypto-js';


const isLocal = process.env.REACT_APP_ISLOCAL === 'true';

function App() {
  const serverURL = isLocal ? "http://localhost:3001" : "https://printmanager-server.onrender.com";

  const [sidebarWidth, setSidebarWidth] = useState(225); // Initial sidebar width
  const [isResizing, setIsResizing] = useState(false);

  const [filamentUsage, setFilamentUsage] = useState('');
  const [name, setname] = useState('');
  const [email, setemail] = useState('');
  const [supervisor, setsupervisor] = useState('');
  const [files, setfiles] = useState('');
  const [notes, setnotes] = useState('');
  const [partNames, setpartnames] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [supervisorPrint, setSupervisorPrint] = useState(false);
  const [personalFilament, setPersonalFilament] = useState(false);

  const [selectedPrinter, selectPrinter] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [adminPswd, setAdminPswd] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackText, setFeedbackText] = useState('');

  const [printerList, setPrinterList] = useState([]);
  const printerRefs = useRef([]);

  const [printerNotes, setPrinterNotes] = useState(null);
  const [printerSort, setPrinterSort] = useState('Availability');

  //const [message, setMessage] = useState('');
  //const [messageType, setMessageType] = useState(null);
  const [messageQueue, setMessageQueue] = useState([]);

  //Printer menu data
  const [curJob, setCurJob] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [editingJob, setEditingJob] = useState({
    email: '',
    files: '',
    jobID: -1,
    name: '',
    partNames: '',
    personalFilament: 0,
    status: '',
    supervisorName: '',
    usage_g: 0,
    notes: ''
  })


  //summary page data
  const [printerNames, setPrinterNames] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [supervisorData, setSupervisorData] = useState([]);
  const [nameFilamentData, setNameFilamentData] = useState([]);
  const [filamentSum, setFilamentSum] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const lineRef1 = useRef(null);
  const lineRef2 = useRef(null);
  const [loading, setLoading] = useState(true)

  const popupTime = 8000;

  const getWarningsBeforeIndex = (index) => {
    let warnCount = 0;
    for (let i = 0; i < index; i++) {
      if (messageQueue[i].type === 'warn') {
        warnCount++;
      }
    }
    return (warnCount);
  }

  //fill data arrays on the initial render
  useEffect(() => {
    try {
      Axios.get(`${serverURL}/api/get`).then((response) => {
        console.log(response);

        const sorted = sortPrinterList(response.data.printers, printerSort)
        setPrinterList(sorted);
        console.log("setting printers to data: ", sorted);
      });
    } catch (error) {
      console.error("Error fetching printer data: ", error);
    }

  }, [serverURL, printerSort, selectedPrinter]);


  // update printRefs whenever printerList changes
  useEffect(() => {
    printerRefs.current = printerList.map((_, i) => printerRefs.current[i] ?? React.createRef());
  }, [printerList])

  // Scroll to selected printer after printer list is updated
  useEffect(() => {
    setMenuOpen(false)
    if (selectedPrinter) {
      // Calculate the new index after the state has updated
      const curIndex = printerList.findIndex(printer => printer.printerName === selectedPrinter.printerName);
      // Scroll to the printer
      if (curIndex !== -1 && printerRefs.current[curIndex]) {
        printerRefs.current[curIndex].current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [selectedPrinter, printerList]); // Run effect when selectedPrinter or printerList changes
  

  //update the printer screen when selectedPrinter changes
  useEffect(() => {
    const createLineChart = (ref, filledPersonalData, filledClubData, dateWidnow) => {

      // Destroy existing chart if it already exists
      if (ref.current.chart) {
        ref.current.chart.destroy();
      }

      // Create the line chart
      const ctx = ref.current.getContext('2d');
      ref.current.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dateWidnow,
          datasets: [{
            label: 'Personal Filament',
            data: filledPersonalData,
            fill: false,
            borderColor: 'rgba(255, 100, 100, 1)',
            tension: 0.1,
          },
          {
            label: 'Club Filament',
            data: filledClubData,
            fill: false,
            borderColor: 'rgba(75, 192, 192, 1)',
            tension: 0.1,
          }],
        },
        options: {
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            },
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 2.5,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      });
    }

    setPrinterNotes(null)
    const generateDateRange = (startDate, endDate) => {
      const dateArray = [];
      let currentDate = new Date(startDate);

      while (currentDate <= new Date(endDate)) {
        dateArray.push(formatDate(new Date(currentDate), false));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dateArray;
    };

    console.log('updating printer screen')
    console.log('selectedPrinter: ' + selectedPrinter)
    //Update the data that is shown
    if (selectedPrinter !== null && selectedPrinter !== undefined) {
      //get data from the database
      try {
        if (selectedPrinter.currentJob !== "" && selectedPrinter.currentJob !== null) {
          //get the current job and store it
          Axios.get(`${serverURL}/api/getjob?jobID=${selectedPrinter.currentJob}`).then((response) => {
            console.log('got current job');
            console.log(response.data.res);
            setCurJob(response.data.res[0]);
            console.log("set curJob to:")
            console.log(response.data.res[0])
          });
        } else {
          setCurJob(null)
        }
        Axios.get(`${serverURL}/api/getHistory?value=${selectedPrinter.printerName}&field=printerName`).then((response) => {
          const newHistory = response.data.historyList.sort((a, b) => new Date(b.timeStarted) - new Date(a.timeStarted))
          setHistoryList(newHistory);
          console.log('Got history list:')
          console.log(newHistory);
        });
      } catch (error) {
        console.error("Error fetching printer data: ", error);
      }
    } else {
      try {
        Axios.get(`${serverURL}/api/getfreq`).then((response) => {
          console.log("frequencies: ");
          console.log(response.data);
          const sortedData = response.data.res;

          setPrinterNames(sortedData.map(printer => printer.printerName));
          setFrequencies(sortedData.map(printer => printer.cnt));
          setFilamentSum(sortedData.map(printer => printer.sum));

          try {
            Axios.get(`${serverURL}/api/getsupervisordata`).then((response) => {
              console.log('supervisor data:')
              setSupervisorData(response.data.res);
              console.log(sortedData)
              Axios.get(`${serverURL}/api/getfilamentdata`).then((response) => {
                console.log('filament name data:')
                setNameFilamentData(response.data.res);
                console.log(response.data.res)

                Axios.get(`${serverURL}/api/getdailyprints`).then((response2) => {
                  console.log("daily data:");
                  console.log(response2.data);
                  if (response2.data) {
                    const dailyData = response2.data.res;
                    const personal = dailyData.filter(item => item.personalFilament)
                    const club = dailyData.filter(item => !item.personalFilament)

                    const startDate = dailyData.length > 0 ? dailyData[0].date : null;
                    const endDate = dailyData.length > 0 ? dailyData[dailyData.length - 1].date : null;
                    if (startDate && endDate) {
                      const allDates = generateDateRange(startDate, endDate);

                      if (lineRef1.current) {
                        const personalDataMap = new Map(personal.map(day => [formatDate(day.date, false), day.cnt]));
                        const clubDataMap = new Map(club.map(day => [formatDate(day.date, false), day.cnt]));

                        // Fill in missing dates with 0
                        const filledPersonalCnt = allDates.map(date => personalDataMap.get(date) || 0);
                        const filledClubCnt = allDates.map(date => clubDataMap.get(date) || 0);

                        createLineChart(lineRef1, filledPersonalCnt, filledClubCnt, allDates)
                      }

                      if (lineRef2.current) {
                        const personalDataMap = new Map(personal.map(day => [formatDate(day.date, false), day.sum]));
                        const clubDataMap = new Map(club.map(day => [formatDate(day.date, false), day.sum]));

                        // Fill in missing dates with 0
                        const filledPersonalSum = allDates.map(date => personalDataMap.get(date) || 0);
                        const filledClubSum = allDates.map(date => clubDataMap.get(date) || 0);

                        createLineChart(lineRef2, filledPersonalSum, filledClubSum, allDates)
                      }
                    }

                  }
                  setLoading(false);
                });
              });
            });
          } catch (error) {
            console.error("Error getting daily stats: ", error);
          }
          setLoadingSummary(false);
        });

      } catch (error) {
        console.error("Error fetching printer data: ", error);
        setLoadingSummary(false);
      }
    }
  }, [selectedPrinter, serverURL, menuOpen, printerList]);


  // Add mouse event listeners to the document for resizing
  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        const newWidth = Math.max(175, Math.min(e.clientX, 400));
        setSidebarWidth(newWidth);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);


  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  })

  const handleHistorySearch = (e) => {
    const newSearch = e.target.value
    setHistorySearch(newSearch);
    console.log("Set historySearch to " + newSearch);
  }

  const handleJobEdit = (e, field) => {
    const newVal = e.target.value
    setEditingJob({ ...editingJob, [field]: newVal });
    console.log("Edited job " + field + " to " + newVal);
  }

  const refreshHistory = () => {
    Axios.get(`${serverURL}/api/getHistory?value=${selectedPrinter.printerName}&field=printerName`).then((response) => {
      const newHistory = response.data.historyList.sort((a, b) => new Date(b.timeStarted) - new Date(a.timeStarted))
      setHistoryList(newHistory);
      console.log('Got history list:')
      console.log(newHistory);
    });
  }

  const saveJob = () => {
    try {
      Axios.put(`${serverURL}/api/updateJob`, editingJob).then(() => {
        const newEditingJob = { ...editingJob, jobID: -1 }
        setEditingJob(newEditingJob);
        refreshHistory();
        console.log('Saved job in history table');
      });
    } catch (error) {
      console.error("Error updating printer: ", error);
    }
  }

  const handleEditClick = (job) => {
    const editingJobFilt = {
      jobID: editingJob.jobID,
      files: truncateString(editingJob.files, 512),
      usage_g: Math.round(parseFloat(editingJob.usage_g)) > 2147483647 ? 2147483647 : Math.round(parseFloat(editingJob.usage_g)),
      status: editingJob.status,
      name: truncateString(editingJob.name, 64),
      supervisor: truncateString(editingJob.supervisorName, 64),
      partNames: truncateString(editingJob.partNames, 256),
      email: truncateString(editingJob.email, 64),
      personalFilament: editingJob.personalFilament,
      notes: truncateString(editingJob.notes, 256)
    }

    if (editingJobFilt.jobID === job.jobID) {
      if (editingJobFilt.status !== job.status) {
        // if the job was made active again, set printer status to busy
        if (editingJobFilt.status === 'active') {
          handlePrinterStatusChange(selectedPrinter.status === 'admin' ? 'admin-busy' : 'busy');
          setCurJob(editingJobFilt);
          selectedPrinter.currentJob = editingJobFilt.jobID;

          //set all other active jobs to completed, then update this job to be active
          Axios.put(`${serverURL}/api/update`, {
            table: "printjob",
            column: "status",
            id: selectedPrinter.printerName,
            val: 'completed'
          }).then(() => {
            updateTable("printer", "currentJob", selectedPrinter.printerName, editingJobFilt.jobID, () => {
              saveJob();
            });
          });
        }
        // if the job status was changed from active, set the printer status to available or admin and reset currentJob
        else if (job.status === 'active') {
          updateTable("printer", "currentJob", selectedPrinter.printerName, '', () => {
            handlePrinterStatusChange(selectedPrinter.status === 'admin-busy' ? 'admin' : 'available');
            saveJob();
          })
          selectedPrinter.currentJob = ''
        } else {
          saveJob();
        }
      } else {
        saveJob();
      }
    } else {
      setEditingJob(job);
      console.log('Editing job: ' + job.jobID);
    }
  }

  const handleDeleteJob = (jobID) => {
    if (curJob && jobID === curJob.jobID) {
      cancelPrint()
      return (null);
    }

    fetch(`${serverURL}/api/deleteJob/${jobID}`, { method: 'DELETE', }).then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }).then(data => {
      refreshHistory();
      console.log('Deleted job with id ' + jobID);
    }).catch(error => {
      console.error('Error:', error);
    });
  }

  const handlePrinterSort = (e) => {
    const newSort = e.target.value;
    setPrinterSort(newSort);
    console.log('now sorting printers by ' + newSort);
  }

  const handleFilamentType = (e) => {
    const newType = e.target.value;
    updateTable("printer", "filamentType", selectedPrinter.printerName, newType, () => {
      selectedPrinter.filamentType = newType;
      const updatedPrinterList = printerList.map(printer => {
        if (printer.printerName === selectedPrinter.printerName) {
          return { ...printer, filamentType: newType };
        }
        return printer;
      });
      setPrinterList(sortPrinterList(updatedPrinterList, printerSort));
    })
    console.log('changed filament type to ' + newType);
  }

  const handlePrinterNotes = (e) => {
    const newPrinterNotes = e.target.value;
    setPrinterNotes(newPrinterNotes);
    console.log('set printerNotes to ' + newPrinterNotes);
  }

  const handleEditPrinterNotesClick = () => {
    if (selectedPrinter && selectedPrinter.notes) {
      setPrinterNotes(selectedPrinter.notes)
      console.log('editing printer notes: ' + selectedPrinter.notes);
    } else {
      setPrinterNotes('')
      console.log('editing printer notes')
    }
  }

  const handleFeedbackSubjectChange = (e) => {
    const newFeedbackSubject = e.target.value;
    console.log('changed feedbackSubject to: ' + newFeedbackSubject);
    setFeedbackSubject(newFeedbackSubject);
  }

  const handleFeedbackTextChange = (e) => {
    const newFeedbackText = e.target.value;
    console.log('changed feedbackText to: ' + newFeedbackText);
    setFeedbackText(newFeedbackText);
  }

  const clearFields = () => {
    setname('');
    setFilamentUsage('');
    setemail('');
    setsupervisor('');
    setfiles('');
    setnotes('');
    setpartnames('');
  }

  const cancelPrint = () => {
    fetch(`${serverURL}/api/cancelPrint/${selectedPrinter.printerName}`, { method: 'DELETE', }).then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }).then(data => {
      updateTable("printer", "currentJob", selectedPrinter.printerName, '', () => {
        handlePrinterStatusChange(selectedPrinter.status === 'admin-busy' ? 'admin' : 'available')
      })
    }).catch(error => {
      console.error('Error:', error);
    });
  }

  const sortPrinterList = (list, by = 'Availability') => {
    let sortedPrinters = []
    const availabilityOrder = ['available', 'admin', 'busy', 'admin-busy', 'testing', 'broken'];

    if (by === 'Availability') {
      sortedPrinters = list.sort((a, b) => {
        const diff = availabilityOrder.indexOf(a.status) - availabilityOrder.indexOf(b.status);
        if (diff === 0) {
          return a.printerName.localeCompare(b.printerName);
        }
        return diff;
      });
    } if (by === 'Printer Name') {
      sortedPrinters = list.sort((a, b) => {
        return a.printerName.localeCompare(b.printerName);
      });
    } if (by === 'Printer Model') {
      sortedPrinters = list.sort((a, b) => {
        if (a.model === b.model) {
          return (availabilityOrder.indexOf(a.status) - availabilityOrder.indexOf(b.status));
        }
        return a.model.localeCompare(b.model);
      });
    } if (by === 'Filament Type') {
      sortedPrinters = list.sort((a, b) => {
        if (a.filamentType === b.filamentType) {
          return (availabilityOrder.indexOf(a.status) - availabilityOrder.indexOf(b.status));
        }
        return a.filamentType.localeCompare(b.filamentType);
      });
    }

    return (sortedPrinters)
  }



  function getDirectDownloadLink(driveLink) {
    // Regular expression to extract the file ID from different Google Drive URL formats
    const fileIdMatch = driveLink.match(/(?:drive\.google\.com\/.*?id=|drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([a-zA-Z0-9_-]{10,})/);

    // If a valid file ID is found, return the direct download link
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    } else {
      //If the file cant be processed, return the original link.
      return driveLink;
    }
  }

  const handleMouseDown = (e) => {
    setIsResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.classList.add('no-select');
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.body.style.cursor = 'default';
    document.body.classList.remove('no-select');
  };

  const handleSendEmailChange = () => {
    console.log('changed sendEmail to ' + !sendEmail);
    setSendEmail(!sendEmail);
  }

  const handleIsAdminChange = (state) => {
    console.log('changed isAdmin to ' + state);
    setIsAdmin(state);
  }

  const handleSupervisorPrintChange = () => {
    console.log('changed supervisorPrint to ' + !supervisorPrint);
    setSupervisorPrint(!supervisorPrint);
  }

  const handlePersonalFilamentChange = () => {
    console.log('changed personalFilament to ' + !personalFilament);
    setPersonalFilament(!personalFilament);
  }

  function getStatusColor(printerStatus) {
    switch (printerStatus) {
      case "available": return "rgb(80, 210, 100)";
      case "busy": return "rgb(235, 235, 60)";
      case "broken": return "rgb(255, 100, 100)";
      case "testing": return "rgb(255,255,255)";
      case "admin": return "rgb(100, 180, 100)";
      case "admin-busy": return "rgb(220, 200, 70)";
      default: return "silver";
    }
  }

  const getStatMsg = () => {
    if (((selectedPrinter.status === 'busy') || (selectedPrinter.status === 'admin-busy')) && curJob) {
      return ("This printer is busy printing: " + ((!curJob.partNames) ? 'No parts specified.' : truncateString(curJob.partNames, 80)))
    } else if (selectedPrinter.status === 'available') {
      return ("This printer is available!")
    } else if (selectedPrinter.status === 'broken') {
      return ("This printer is broken.. (0_0)")
    } else if (selectedPrinter.status === 'testing') {
      return ("This printer is currently in testing, and is not available to print on.")
    } else if ((selectedPrinter.status === 'admin') && !isAdmin) {
      return ("This printer is only available for admins. Please contact an officer if you would like to use this printer.")
    } else if ((selectedPrinter.status === 'admin') && isAdmin) {
      return ("This printer is available for you to print on!")
    } else {
      return ("")
    }
  }

  const checkPswd = (given, actual) => {
    const hash = CryptoJS.SHA256(given).toString();
    console.log('given pswd: ' + hash)
    console.log('actual pswd: ' + actual)
    if (hash === actual) {
      showMsgForDuration("Logged in as Admin!", 'msg', popupTime);
      handleIsAdminChange(true)
    } else {
      showMsgForDuration("Password  Incorrect.", 'err', popupTime);
    }
    setAdminPswd('')
  }

  const handleKeyPress = (e) => {
    const isInputFocused =
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA';

    if (!isInputFocused) {
      if (!menuOpen) {
        switch (e.key) {
          case 'Backspace':
            selectPrinter(null)
            break;
          case 'ArrowLeft':
            e.preventDefault();
            movePrinter(-1);
            break;
          case 'ArrowRight':
            e.preventDefault();
            movePrinter(1);
            break;
          default:
        }
      } else {
        if (e.key === 'Backspace') {
          setMenuOpen(false)
        }
      }
      if (e.key === 's') {
        handleOpenMenu();
      } else if (e.key === 'c') {
        setMessageQueue([]);
      }
    } else if (menuOpen && e.key === 'Enter') {
      if (e.target.id === "adminInput") {
        checkPswd(adminPswd, process.env.REACT_APP_ADMIN_PSWD)
      } else if (e.target.id === "subjectInput" || e.target.id === "feedbackInput") {
        handleFeedbackClick();
      }
    } else if (!menuOpen && editingJob.jobID !== -1 && e.key === 'Enter') {
      handleEditClick(editingJob);
    }
    if (!menuOpen && editingJob.jobID === -1 && e.key === 'Enter') {
      handleStartPrintClick();
    }
  }

  const handleFeedbackClick = () => {
    if (feedbackSubject.length <= 0) {
      showMsgForDuration("No Feedback Subject! Not sent.", 'err', popupTime)
    } else if (feedbackText.length <= 0) {
      showMsgForDuration("No Feedback Text! Not sent.", 'err', popupTime)
    } else {
      sendMail('3DPC PrintManager Feedback - ' + feedbackSubject, feedbackText, "thomp907@purdue.edu")
      setFeedbackSubject('')
      setFeedbackText('')
    }
  }

  const movePrinter = (direction) => {
    console.log('moving printer by arrow key...')
    console.log(selectedPrinter)
    if (selectedPrinter === null) {
      handlePrinterClick(0);
      return;
    }
    try {
      let curIndex = printerList.findIndex(printer => printer.printerName === selectedPrinter.printerName);
      curIndex = (curIndex + direction) % printerList.length;
      if (curIndex === -1) curIndex = printerList.length - 1;
      handlePrinterClick(curIndex);
    } catch (e) {
      console.log('arrow press failed: printer not found in printerList:\n' + e)
    }
  }

  const truncateString = (str, maxLen) => {
    if (str === null || str === undefined) return ('')
    if (str.length > maxLen - 3) {
      return str.substring(0, maxLen - 3) + '...';
    }
    return str;
  }

  const updateTable = (table, column1, id, val, callback) => {
    try {
      Axios.put(`${serverURL}/api/update`, {
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
    console.log('changing printer ' + selectedPrinter.printerName + '\'s status to ' + statusArg)
    //first, update the database to have the new printer status
    updateTable("printer", "status", selectedPrinter.printerName, statusArg, () => {
      //then, update the local printer array to reflect this change
      const updatedPrinterList = printerList.map(printer => {
        if (printer.printerName === selectedPrinter.printerName) {
          return { ...printer, status: statusArg };
        }
        return printer;
      });
      setPrinterList(sortPrinterList(updatedPrinterList, printerSort));
      selectedPrinter.status = statusArg;
    });
  };

  const printerChangeWhileBusy = (statusArg) => {
    handlePrintDoneClick("failed", () => {
      handlePrinterStatusChange(statusArg);
    });
  };

  const handleStartPrintClick = (queue = false) => {
    if (selectedPrinter !== null) {
      //check for incorrect or empty values
      if (selectedPrinter.status !== 'available' && selectedPrinter.status !== 'admin') {
        showMsgForDuration("This printer is not available!", 'err', popupTime);
      } else if (selectedPrinter.status === 'admin' && !isAdmin) {
        showMsgForDuration("This printer is not available!", 'err', popupTime);
      } else if (name.length === 0) {
        console.log("startPrintClick: err: no name");
        showMsgForDuration("No Name! Print not started.", 'err', popupTime);
      } else if ((email.length === 0) && !supervisorPrint) {
        console.log("startPrintClick: err: no email");
        showMsgForDuration("No Email! Print not started.", 'err', popupTime);
      } else if ((supervisor.length === 0) && !supervisorPrint) {
        console.log("startPrintClick: err: no supervisor");
        showMsgForDuration("No Supervisor! Print not started.", 'err', popupTime);
      } else if ((partNames.length === 0) && !supervisorPrint) {
        console.log("startPrintClick: err: no partNames");
        showMsgForDuration("No Part Names! Print not started.", 'err', popupTime);
      }// else if (files.length === 0) {
      //   console.log("startPrintClick: err: no files");
      //   showErrForDuration("No Files! Print not started.", popupTime);
      // }
      else if ((filamentUsage === 0) || (filamentUsage === "")) {
        console.log("startPrintClick: err: no filamentUsage");
        showMsgForDuration("No Filament Usage! Print not started.", 'err', popupTime);
      } else if (historyList.filter(item => item.status === 'queued').some(job => job.name === name)) {
        console.log("startPrintClick: warn: duplicate name entry in queue");
        showMsgForDuration(`Warning: A job with this name is already queued!\nRemove it and continue?`, 'warn', popupTime + 2000);
      } else if (historyList.filter(item => item.status === 'queued').length >= 5) {
        console.log("startPrintClick: warn: already 5 queued resin prints");
        showMsgForDuration("Resin queue is full! Print not queued.", 'err', popupTime);
      } else if ((selectedPrinter.filamentType === 'PETG') || (selectedPrinter.filamentType === 'TPU')) {
        console.log("startPrintClick: warn: filament type not PLA");
        showMsgForDuration(`Warning: ${selectedPrinter.filamentType} costs $0.10 / g, even for members.\nPlease only use ${selectedPrinter.filamentType} filament on this printer!`, 'warn', popupTime + 2000);
      } else if (filamentUsage > 1000) {
        console.log("startPrintClick: warn: filamentUsage > 1000g");
        showMsgForDuration("Warning: Filament Usage Exceeds 1kg\nContinue anyway?", 'warn', popupTime);
      } else {
        //all fields have valid values...
        //clear all warning popups 
        setMessageQueue(prevQueue => prevQueue.filter(message => !message.msg.startsWith("Warning:")));

        // insert the print to the "printJob" table
        console.log("startPrintClick: all fields valid, inserting to printJob");
        startPrint(queue);
      };
    };
  };

  const handleWarningClick = (id) => {
    setMessageQueue(prevQueue => prevQueue.filter(message => !message.msg.startsWith("Warning:")));
    startPrint();
  }

  const startPrint = (queue = false) => {
    try {
      Axios.post(`${serverURL}/api/insert`, {
        printerName: selectedPrinter.printerName,
        files: truncateString(files, 512),
        usage_g: Math.round(parseFloat(filamentUsage)) > 2147483647 ? 2147483647 : Math.round(parseFloat(filamentUsage)),
        timeStarted: new Date().toISOString(),
        status: selectedPrinter.filamentType === 'Resin' ? "queued" : "active",
        name: truncateString(name, 64),
        supervisor: supervisorPrint ? truncateString(name, 64) : truncateString(supervisor, 64),
        notes: truncateString(notes, 256),
        partNames: truncateString(partNames, 256),
        email: truncateString(email, 64),
        personalFilament: personalFilament
      }).then(() => {
        if (!queue) {
          setTimeout(() => {
            //update the current job of the printer that was selected for the print
            try {
              Axios.get(`${serverURL}/api/getCurrentJob?printerName=${selectedPrinter.printerName}`).then((response) => {
                console.log("CurrentJob data: ");
                console.log(response.data);
                //update the printer status of the printer that was given the job
                updateTable("printer", "status", selectedPrinter.printerName, selectedPrinter.status === 'admin' ? "admin-busy" : "busy", () => {
                  //update the currentJob of the printer that was used for the printJob
                  if (response.data.currentJob[0]) {
                    updateTable("printer", "currentJob", selectedPrinter.printerName, response.data.currentJob[0].jobID, () => {
                      const updatedPrinterList = printerList.map(printer => {
                        if (printer.printerName === selectedPrinter.printerName) {
                          let newPrinter = {
                            ...printer, status: selectedPrinter.status === 'admin' ? 'admin-busy' : "busy",
                            currentJob: response.data.currentJob[0].jobID
                          }
                          selectPrinter(newPrinter)
                          return newPrinter;
                        }
                        return printer;
                      });
                      setPrinterList(sortPrinterList(updatedPrinterList, printerSort));
                    });
                  }
                });
              });
            } catch (error) {
              console.error("Error fetching printer data: ", error);
            }
          });
        } else {
          Axios.get(`${serverURL}/api/getHistory?value=${selectedPrinter.printerName}&field=printerName`).then((response) => {
            const newHistory = response.data.historyList.sort((a, b) => new Date(b.timeStarted) - new Date(a.timeStarted))
            setHistoryList(newHistory);
            console.log('Got history list:')
            console.log(newHistory);
          });
        }
      }, 500)
    } catch (error) {
      console.error('Error submitting printJob: ', error);
    }

    //lastly, clear the fields of the text input and filament selected
    clearFields();
    console.log('selectedPrinter');


    console.log(selectedPrinter);

    //close error message if its still open
    //setMessageType(null)

    showMsgForDuration(selectedPrinter.filamentType === 'Resin' ? 'Print job queued!'
      : `Print job successfully started!`, 'msg', popupTime);
  };

  const sendMail = (subject, text, target = curJob.email,) => {
    if (target.length === 0) {
      showMsgForDuration('Email not sent: No target', 'err', popupTime);
    } else {
      Axios.post(`${serverURL}/api/send-email`, {
        to: target,
        subject: subject,
        text: text
      }).then(() => {
        showMsgForDuration('Email Sent Successfully', 'msg', popupTime);
      }).catch((error) => {
        showMsgForDuration('Error Sending Email', popupTime);
        console.error('Error sending email:', error.response ? error.response.data : error.message);
      });

    }
  }

  const updatePrinterNotes = () => {
    //set the printJob status to statusArg
    Axios.put(`${serverURL}/api/update`, {
      table: "printer",
      column: "notes",
      id: selectedPrinter.printerName,
      val: truncateString(printerNotes, 512)
    }).then(() => {
      //apply the changes locally
      const updatedPrinterList = printerList.map(printer => {
        if (printer.printerName === selectedPrinter.printerName) {
          return { ...printer, notes: truncateString(printerNotes) };
        }
        return printer;
      });
      setPrinterList(updatedPrinterList);
      selectedPrinter.notes = truncateString(printerNotes, 512);
      setPrinterNotes(null);
    })
  }


  const handlePrintDoneClick = (statusArg, callback) => {
    try {
      console.log("print done was clicked... setting printer status to available");
      //set status to available
      updateTable("printer", "status", selectedPrinter.printerName, selectedPrinter.status === 'admin-busy' ? 'admin' : "available", () => {

        //set the printJob status to statusArg
        Axios.put(`${serverURL}/api/update`, {
          table: "printjob",
          column: "status",
          id: selectedPrinter.printerName,
          val: statusArg
        }).then(() => {
          //remove currentJob
          console.log("removing printer's currentJob...");
          updateTable("printer", "currentJob", selectedPrinter.printerName, "", () => {

            //apply the changes locally
            const updatedPrinterList = printerList.map(printer => {
              if (printer.printerName === selectedPrinter.printerName) {
                return { ...printer, status: selectedPrinter.status === 'admin-busy' ? 'admin' : "available", currentJob: "" };
              }
              return printer;
            });
            setPrinterList(sortPrinterList(updatedPrinterList, printerSort));
            console.log(updatedPrinterList)

            //Email the user and set popup message
            if (sendEmail) {
              console.log('sending email...')
              let success = statusArg === 'completed'

              let text = success ? "Hello " + curJob.name + ", \n \n Your 3D print of [" + curJob.partNames +
                "] that started at " + formatDate(curJob.timeStarted, true) + " has been completed. It has been dropped off at the " +
                "1st floor of Lambertus Hall room 1234 in the 3DPC drop-box.\n\n\nThank you, \n Purdue 3D Printing Club "
                :
                "Hello " + curJob.name + ", \n \n Your 3D print of [" + curJob.partNames +
                "] that started at " + formatDate(curJob.timeStarted, true) + " has not been completed." +
                " The print has failed multiple times and you will need to come back " +
                "to the lab (at LMBS1234) to try again. \n\n\nThank you, \n Purdue 3D Printing Club"

              try {
                if (success) {
                  sendMail("3DPC: Print Completed", text)
                } else {
                  // Pull the count of prints with the same part names that failed
                  try {
                    Axios.get(`${serverURL}/api/getFailureCount?parts=${curJob.partNames}&name=${curJob.name}`).then((response) => {
                      let failureCount = response.data.count[0].cnt
                      console.log('failure count: ' + failureCount)
                      if (failureCount >= 3) {
                        sendMail("3DPC: Print Failed", text);
                      } else {
                        showMsgForDuration(`Email not sent. Failures: ${failureCount}`, 'err', popupTime);
                      }
                    });
                  } catch (error) {
                    console.error("Error fetching failure count: ", error);
                  }
                }

              } catch (e) {
                showMsgForDuration('Error Sending Email', 'err', popupTime);
                console.log('Error sending email:', e);
              }
            } else {
              console.log('not sending email...')
              showMsgForDuration('No Email Sent. (Disabled)', 'err', popupTime);
            }

            selectedPrinter.status = selectedPrinter.status === 'admin-busy' ? 'admin' : 'available';
            setCurJob(null)

            if (typeof callback === 'function') {
              callback();
            }

            console.log("Print finished, done updating the database.");

          });
        });
      });
    } catch (error) {
      console.error("Error updating printer: ", error);
    }
  };

  const handleMsgExit = (id) => {
    setMessageQueue(prevQueue => prevQueue.filter(message => message.id !== id));
  }

  // const showMsgForDuration = (msg, type, duration) => {
  //   console.log(type + ": "+msg)
  //   setMessageType(type)
  //   setMessage(msg);
  //   setTimeout(() => {
  //     setMessageType(null);
  //   }, duration);
  // };
  useEffect(() => {
    // Log the messageQueue whenever it changes
    console.log("Updated messageQueue:", messageQueue);
  }, [messageQueue]);

  const showMsgForDuration = (msg, type, duration) => {
    console.log('adding ' + msg + 'to the queue...')
    const id = Date.now(); // Unique ID for each message

    setMessageQueue(prevQueue => [...prevQueue, { id, msg, type }]);

    // Set a timeout to remove the message after its duration
    setTimeout(() => {
      console.log('removing ' + msg + 'from the queue...')

      setMessageQueue(prevQueue => prevQueue.filter(message => message.id !== id))
    }, duration);
  };

  const handlePrinterClick = (index) => {
    let printer = printerList[index];
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

  const fillFromSheets = (e) => {
    try {
      const url = 'https://script.google.com/macros/s/AKfycbwdMweriskP6srd5gir1qYlA3jRoTxA2YiHcbCt7555LoqBs_BZT-OfKUJiP53kihQV/exec';
      fetch(url).then(response => response.json()).then(data => {
        if (data !== null && data.length > 0) {
          console.log('fetched form data: ');
          console.log(data)
          showMsgForDuration('Form Filled Successfully!', 'msg', popupTime);

          let formData = data[0];
          // fill the form's fields with the data we just pulled...
          setname(formData[1]);
          setemail(formData[2]);
          setsupervisor(formData[10])
          setfiles(formData[4]);
          setnotes(formData[8]);
          setpartnames(formData[9]);
        } else {
          showMsgForDuration('Error Filling Form...', 'err', popupTime);
        }
      });
    } catch (e) {
      showMsgForDuration('Error Filling Form...', 'err', popupTime);
    }
  };

  const handlefiles = (e) => {
    const files = e.target.value;
    setfiles(files);
    console.log("set files to " + files);
  };

  const handlePswdChange = (e) => {
    const pswd = e.target.value;
    console.log('changed adminPswd to ' + pswd);
    setAdminPswd(pswd);
  }

  const handlenotes = (e) => {
    const notes = e.target.value;
    setnotes(notes);
    console.log("set notes to " + notes);
  };

  const handleFileUpload = (e) => {
    let filesList = Array.from(e.target.files).map((file) => {
      return (file.name)
    })
    const file = filesList.join(', ');
    if (file) {
      setfiles(file);
      console.log("set file to: " + file)
    }
  };

  const handlePartsUpload = (e) => {
    let filesList = Array.from(e.target.files).map((file) => {
      return file.name.substring(0, file.name.lastIndexOf('.')) || file;
    })
    const file = filesList.join(', ');
    if (file) {
      setpartnames(file);
      console.log("set partnames to: " + file)
    }
  };

  const handlename = (e) => {
    const name = e.target.value;
    setname(name);
    console.log("set name to " + name);
  };

  const handleemail = (e) => {
    const email = e.target.value;
    setemail(email);
    console.log("set email to " + email);
  };

  const handlesupervisor = (e) => {
    const supervisor = e.target.value;
    setsupervisor(supervisor);
    console.log("set supervisor to " + supervisor);
  };

  const handlePartNames = (e) => {
    const names = e.target.value;
    setpartnames(names);
    console.log("set partNames to " + names);
  };

  const handleFilamentUsage = (e) => {
    // only allow numbers and periods
    const filtered = e.target.value.replace(/[^0-9.]/g, "");
    // only allow up to two decimal places
    let usage = filtered.indexOf('.') !== -1 ? filtered.slice(0, filtered.indexOf('.') + 1 + 2) : filtered;
    //remove extra period marks
    const parts = usage.split('.');
    if (parts.length > 2) {
      usage = parts[0] + '.' + parts.slice(1).join('').replace(/\./g, '');
    }

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

  function formatDate(isoString, time) {
    const date = new Date(isoString);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours() % 12 || 12).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const amOrPm = date.getHours() >= 12 ? 'PM' : 'AM';
    return time ? `${mm}/${dd}/${yyyy} ${hh}:${min} ${amOrPm}` : `${mm}/${dd}/${yyyy}`;
  }

  const createHistoryRow = (job, queue = false) => {
    return (
      <>
        {isAdmin && <td><button onClick={() => { handleDeleteJob(job.jobID) }} className='history-btn'>delete</button></td>}
        {
          isAdmin && <td> <button onClick={() => handleEditClick(job)} className='history-btn'>
            {editingJob.jobID !== job.jobID ? 'edit' : 'save'}
          </button></td>
        }
        <td dangerouslySetInnerHTML={{ __html: applyHighlight(formatDate(job.timeStarted, true), 40) }} />

        {
          (isAdmin && (editingJob.jobID === job.jobID)) ?
            <>
              {!queue && <td>
                <select id="jobStatus" style={{ width: "100%" }} value={editingJob.status} onChange={(e) => handleJobEdit(e, "status")}>
                  <option value="active">active</option>
                  <option value="completed">completed</option>
                  <option value="failed">failed</option>
                </select>
              </td>}
              <td><input type="text" className="history-edit" value={editingJob.partNames} onChange={(e) => handleJobEdit(e, "partNames")}></input></td>
              <td><input type="text" className="history-edit" value={editingJob.name} onChange={(e) => handleJobEdit(e, "name")}></input></td>
              <td><input type="text" className="history-edit" value={editingJob.email} onChange={(e) => handleJobEdit(e, "email")}></input></td>
              <td><input type="text" className="history-edit" value={editingJob.supervisorName} onChange={(e) => handleJobEdit(e, "supervisorName")}></input></td>
              {!queue && <td>
                <select id="personalFilament" style={{ width: "100%" }} value={editingJob.personalFilament} onChange={(e) => handleJobEdit(e, "personalFilament")}>
                  <option value="0">club</option>
                  <option value="1">personal</option>
                </select>
              </td>}
              <td><input type="text" className="history-edit" value={editingJob.usage_g} onChange={(e) => handleJobEdit(e, "usage_g")}></input></td>
              <td><input type="text" className="history-edit" value={editingJob.notes} onChange={(e) => handleJobEdit(e, "notes")}></input></td>
              <td><input type="text" className="history-edit" value={editingJob.files} onChange={(e) => handleJobEdit(e, "files")}></input></td>
            </>
            :
            <>
              {!queue && <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.status, 40) }} />}
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.partNames, 40) }} />
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.name, 20) }} />
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.email, 30) }} />
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.supervisorName, 20) }} />
              {!queue && <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.personalFilament ? 'personal' : 'club', 20) }} />}
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.usage_g.toString(), 20) }} />
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.notes, 128) }} />
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.files, 256) }} />
            </>
        }
      </>
    )
  }

  // Highlight the search in the job's fields by wrapping it with <b>
  const applyHighlight = (text, length = 40) => {
    if (!text || !historySearch) return truncateString(text, length);
    const truncatedText = truncateString(text, length);
    const regex = new RegExp(historySearch, 'i');

    // Replace the search term with a bold html tag around the matched text
    return truncatedText.replace(regex, (match) => {
      return `<b style="color: rgb(40,200,40);">${match}</b>`;
    });
  };

  return (
    <div className="App">
      <Sidebar printerList={printerList} handlePrinterClick={handlePrinterClick} selectedPrinter={selectedPrinter}
        handleOpenMenu={handleOpenMenu} menuOpen={menuOpen} selectPrinter={selectPrinter} width={sidebarWidth} getStatusColor={getStatusColor}
        printerSort={printerSort} handlePrinterSort={handlePrinterSort} printerRefs={printerRefs} />

      <div id="resizer" onMouseDown={handleMouseDown} style={{ marginLeft: `${sidebarWidth - 1}px` }}></div>

      <div className='main-content' style={{ marginLeft: `${sidebarWidth}px` }}>
        <div style={{ height: selectedPrinter ? '105px' : '75px' }}></div>

        <div className="printer-screen">
          {(!selectedPrinter && !menuOpen) && <div>
            <div className='null'>
              No printer selected! <br></br>Choose one from the printer list on the left.
            </div>
            {!loadingSummary && <div>
              <h2 style={{ fontSize: "xx-large" }}>Lab Summary</h2>
              <div className='chart-wrapper'>
                {!loading && <div className='pie'>
                  <div className='pie-chart'>
                    <h2>Total Number of Jobs Per Printer</h2>
                    <Pie data={{
                      labels: printerNames.map(name => truncateString(name, 15)),
                      datasets: [{ data: frequencies, },
                      { data: [], }],
                    }}
                      options={{
                        maintainAspectRatio: true,
                        aspectRatio: 1,
                        plugins: {
                          legend: {
                            position: 'right',
                          },
                        },
                      }} />
                  </div>

                  <div className='pie-chart'>
                    <h2>Total Filament Used Per Printer (g)</h2>
                    <Pie data={{
                      labels: printerNames.map(name => truncateString(name, 15)),
                      datasets: [{ data: filamentSum, },
                      { data: [], }],
                    }}
                      options={{
                        plugins: {
                          legend: {
                            position: 'right',
                          },
                        },
                      }} />
                  </div>
                </div>}
                <div className='line-chart'>
                  <h2 style={{ marginBottom: "10px" }}>Total Prints By Day</h2>
                  <canvas ref={lineRef1} width="400" height="300"></canvas>
                </div>
                <div className='line-chart'>
                  <h2 style={{ marginBottom: "10px" }}>Total Filament Usage By Day (g)</h2>
                  <canvas ref={lineRef2} width="400" height="300"></canvas>
                </div>
                {!loading && <div className="pie">
                  <div className='pie-chart'>
                    <h2>Number of Prints By Supervisor</h2>
                    <Pie data={{
                      labels: supervisorData.map((entry) => { return (truncateString(entry.supervisorName, 20)) }),
                      datasets: [{
                        data: supervisorData.map((entry) => {
                          return (entry.cnt)
                        }),
                      },
                      { data: [], }],
                    }} options={{
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      },
                    }} />
                  </div>

                  <div className='pie-chart'>
                    <h2>Filament Used by Person</h2>
                    <Pie data={{
                      labels: nameFilamentData.map((entry) => { return (truncateString(entry.name, 20)) }),
                      datasets: [{
                        data: nameFilamentData.map((entry) => { return (entry.sum) }),
                      },
                      {
                        data: [],
                      }
                      ],
                    }} options={{
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      },
                    }} />
                  </div>
                </div>}
              </div>
              <div style={{ height: '80px' }} />
            </div>}
          </div>}

          {selectedPrinter && !menuOpen && <div>
            <div style={{ height: "35px" }}></div>
            <div className='stat-msg'>
              {getStatMsg()}
              <hr style={{ borderTop: '1px solid black', width: '100%' }} />
              {selectedPrinter.filamentType !== 'Resin' ? (isAdmin ? <div> {"Use "}
                <select id="filamentType" value={selectedPrinter.filamentType} onChange={handleFilamentType}>
                  <option value="PLA">PLA</option>
                  <option value="PETG">PETG</option>
                  <option value="TPU">TPU</option>

                </select>
                {" filament on this printer."}</div>
                :
                "Use " + selectedPrinter.filamentType + " filament on this printer.")
                :
                "This is a Resin Printer."
              }
            </div>
            <br />
            {
              (curJob && (selectedPrinter.status === 'busy' || selectedPrinter.status === 'admin-busy')) &&
              <div>
                <div className='stat-msg info' style={{ backgroundColor: 'white', textAlign: 'left' }}>
                  &nbsp;Name: {curJob.name}
                  <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                  &nbsp;Email: {curJob.email}
                  <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                  &nbsp;Supervisor: {curJob.supervisorName}
                  <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                  &nbsp;Files: {curJob.files}
                  <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                  &nbsp;Notes: {curJob.notes}
                </div>

              </div>
            }


            {/* Printer status pages: busy, available, admin, admin-busy, broken, and testing */}

            {((selectedPrinter.status === "busy") || ((selectedPrinter.status === "admin-busy") && isAdmin)) && <div>
              <button onClick={() => { handlePrintDoneClick("completed", null) }} style={{ backgroundColor: "rgba(100, 246, 100,0.8)" }} className='printer-btn'>Print Done</button>
              <button onClick={() => { handlePrintDoneClick("failed", null) }} style={{ backgroundColor: "rgba(246, 155, 97,0.8)" }} className='printer-btn'>Print Failed</button>
              <button onClick={() => { cancelPrint() }} style={{ backgroundColor: 'rgba(118, 152, 255,0.8)' }} className='printer-btn'>Cancel Print</button>
              {isAdmin && <div>
                <button onClick={() => { printerChangeWhileBusy("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>Printer Broke</button>
                <button onClick={() => { printerChangeWhileBusy("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>Testing Printer</button>
                {selectedPrinter.status === 'busy' && <button onClick={() => { printerChangeWhileBusy("admin") }} style={{ backgroundColor: "rgba(100, 180, 100, 0.8)" }} className='printer-btn'>Admin Printer</button>}
              </div>}
              <br />
              {
                curJob && curJob.files.split(',').map((link, index) => {
                  if (link.trim().startsWith('https://')) {
                    return (<button className='printer-btn' key={index} onClick={() => window.location.href = getDirectDownloadLink(link.trim())}>
                      Download File {index + 1}
                    </button>)
                  } else {
                    return ('');
                  }
                })
              }
              {/* Checkbox to toggle email sending */}
              <div>
                <label
                  className={`checkbox-container ${sendEmail ? 'active' : ''}`}>
                  <input type="checkbox" checked={sendEmail} onChange={handleSendEmailChange} />
                  <span className="custom-checkbox"></span>
                  <span style={{ userSelect: 'none' }} className="checkbox-label">Send Email</span>
                </label>
              </div>
            </div>}

            {selectedPrinter && (selectedPrinter.status === "available") && <div>
              <div>
                <div className='printForm'>
                  <button onClick={fillFromSheets} style={{ fontSize: 'small', marginBottom: '5px', cursor: 'pointer' }}>Autofill From Latest Print Form Submission...</button>
                  <div> Name: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <input placeholder="Purdue Pete" value={name} onChange={handlename} style={{ width: '300px', 'fontSize': 'large' }}></input></div>
                  <div className={`${supervisorPrint ? 'disabled' : 'enabled'}`}> Email: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="pete123@purdue.edu" value={email} onChange={handleemail} style={{ width: '300px', 'fontSize': 'large' }}></input></div>
                  <div className={`supervisor-input ${supervisorPrint ? 'disabled' : 'enabled'}`}> Supervisor:&nbsp;&nbsp; <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="Supervisor Name" value={supervisorPrint ? name : supervisor} onChange={handlesupervisor} style={{ width: '300px', 'fontSize': 'large' }}></input></div>
                  <div className={`${supervisorPrint ? 'disabled' : 'enabled'}`}> Parts:&nbsp;
                    <input type="file" multiple onChange={handlePartsUpload} style={{ display: 'none' }} id="parts-upload" />
                    <button tabIndex="-1" className={`file-upload`} onClick={() => document.getElementById('parts-upload').click()} style={{ fontSize: 'small', marginRight: '2px', marginLeft: '4px' }}>browse...</button>
                    <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="part1, part2, part3" value={partNames} onChange={handlePartNames} style={{ width: '300px', 'fontSize': 'large' }}></input></div>

                  <div className={`${supervisorPrint ? 'disabled' : 'enabled'}`}> Files:&nbsp;&nbsp;
                    <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload" />
                    <button tabIndex="-1" className={`file-upload`} onClick={() => document.getElementById('file-upload').click()} style={{ fontSize: 'small', marginRight: '2px', marginLeft: '4px' }}>browse...</button>
                    <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="(Optional) Google Drive links" value={files} onChange={handlefiles} style={{ width: '300px', 'fontSize': 'large' }}></input>
                  </div>
                  <div> Filament Usage: <input value={filamentUsage} placeholder="12.34" type="text" onChange={handleFilamentUsage} style={{ width: '50px', 'fontSize': 'large' }}></input> g</div>
                  <div style={{ marginTop: '10px' }}> -- Notes (Optional) --
                    <br />
                    <textarea value={notes} type="text" onChange={handlenotes} style={{ width: '400px', height: '60px', fontSize: 'large', resize: 'none' }}></textarea></div>
                </div>

                <br />
                <button onClick={() => { handleStartPrintClick(selectedPrinter.filamentType === 'Resin') }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>{selectedPrinter.filamentType === 'Resin' ? 'Queue Print' : 'Start Print'}</button>
                <button onClick={() => { clearFields() }} style={{ backgroundColor: 'rgba(118, 152, 255,0.8)' }} className='printer-btn'>Clear Form</button>
                {isAdmin && <div style={{ display: 'block' }}>
                  <button onClick={() => { handlePrinterStatusChange("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>Printer Broke</button>
                  <button onClick={() => { handlePrinterStatusChange("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>Testing Printer</button>
                  <button onClick={() => { handlePrinterStatusChange("admin") }} style={{ backgroundColor: "rgba(100, 180, 100, 0.8)" }} className='printer-btn'>Admin Printer</button>
                </div>}

                <br />
                {/* Checkbox to toggle supervisor print */}
                <label
                  className={`checkbox-container ${supervisorPrint ? 'active' : ''}`}>
                  <input type="checkbox" checked={supervisorPrint} onChange={handleSupervisorPrintChange} />
                  <span className="custom-checkbox"></span>
                  <span style={{ userSelect: 'none' }} className="checkbox-label">Supervisor Print</span>
                </label>
                {/* Checkbox to toggle personal filament */}
                {(selectedPrinter.filamentType !== 'Resin') && <label
                  className={`checkbox-container ${personalFilament ? 'active' : ''}`}>
                  <input type="checkbox" checked={personalFilament} onChange={handlePersonalFilamentChange} />
                  <span className="custom-checkbox"></span>
                  <span style={{ userSelect: 'none' }} className="checkbox-label">Personal Filament</span>
                </label>}
                <br />
                {
                  files && files.split(',').map((link, index) => {
                    if (link.trim().startsWith('https://')) {
                      return (<button className='printer-btn' key={index} onClick={() => window.location.href = getDirectDownloadLink(link.trim())}>
                        Download File {index + 1}
                      </button>)
                    } else {
                      return ('')
                    }
                  })
                }
              </div>

            </div>}

            {selectedPrinter && (selectedPrinter.status === "admin") && isAdmin && <div>
              <div className='printForm'>
                <button onClick={fillFromSheets} style={{ fontSize: 'small', marginBottom: '5px', cursor: 'pointer' }}>Autofill From Latest Print Form Submission...</button>
                <div> Name: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <input placeholder="Purdue Pete" value={name} onChange={handlename} style={{ width: '300px', 'fontSize': 'large' }}></input></div>
                <div className={`${supervisorPrint ? 'disabled' : 'enabled'}`}> Email: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="pete123@purdue.edu" value={email} onChange={handleemail} style={{ width: '300px', 'fontSize': 'large' }}></input></div>
                <div className={`supervisor-input ${supervisorPrint ? 'disabled' : 'enabled'}`}> Supervisor:&nbsp;&nbsp; <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="Supervisor Name" value={supervisorPrint ? name : supervisor} onChange={handlesupervisor} style={{ width: '300px', 'fontSize': 'large' }}></input></div>
                <div className={`${supervisorPrint ? 'disabled' : 'enabled'}`}> Parts:&nbsp;
                  <input type="file" multiple onChange={handlePartsUpload} style={{ display: 'none' }} id="parts-upload" />
                  <button tabIndex="-1" className={`file-upload`} onClick={() => document.getElementById('parts-upload').click()} style={{ fontSize: 'small', marginRight: '2px', marginLeft: '4px' }}>browse...</button>
                  <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="part1, part2, part3" value={partNames} onChange={handlePartNames} style={{ width: '300px', 'fontSize': 'large' }}></input></div>

                <div className={`${supervisorPrint ? 'disabled' : 'enabled'}`}> Files:&nbsp;&nbsp;
                  <input type="file" multiple onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload" />
                  <button tabIndex="-1" className={`file-upload`} onClick={() => document.getElementById('file-upload').click()} style={{ fontSize: 'small', marginRight: '2px', marginLeft: '4px' }}>browse...</button>
                  <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="(Optional) Google Drive links" value={files} onChange={handlefiles} style={{ width: '300px', 'fontSize': 'large' }}></input>
                </div>
                <div> Filament Usage: <input value={filamentUsage} placeholder="12.34" type="text" onChange={handleFilamentUsage} style={{ width: '50px', 'fontSize': 'large' }}></input> g</div>
                <div style={{ marginTop: '10px' }}> -- Notes (Optional) --
                  <br />
                  <textarea value={notes} type="text" onChange={handlenotes} style={{ width: '400px', height: '60px', fontSize: 'large', resize: 'none' }}></textarea></div>
              </div>

              <br />
              <button onClick={() => { handleStartPrintClick(selectedPrinter.filamentType === 'Resin') }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>{selectedPrinter.filamentType === 'Resin' ? 'Queue Print' : 'Start Print'}</button>
              <button onClick={() => { clearFields() }} style={{ backgroundColor: 'rgba(118, 152, 255,0.8)' }} className='printer-btn'>Clear Form</button>
              {isAdmin && <div style={{ display: 'block' }}>
                <button onClick={() => { handlePrinterStatusChange("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>Printer Broke</button>
                <button onClick={() => { handlePrinterStatusChange("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>Testing Printer</button>
                <button onClick={() => { handlePrinterStatusChange("available") }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>Printer Available</button>
              </div>}

              <br />
              {/* Checkbox to toggle supervisor print */}
              <label
                className={`checkbox-container ${supervisorPrint ? 'active' : ''}`}>
                <input type="checkbox" checked={supervisorPrint} onChange={handleSupervisorPrintChange} />
                <span className="custom-checkbox"></span>
                <span style={{ userSelect: 'none' }} className="checkbox-label">Supervisor Print</span>
              </label>
              {/* Checkbox to toggle personal filament */}
              {(selectedPrinter.filamentType !== 'Resin') && <label
                className={`checkbox-container ${personalFilament ? 'active' : ''}`}>
                <input type="checkbox" checked={personalFilament} onChange={handlePersonalFilamentChange} />
                <span className="custom-checkbox"></span>
                <span style={{ userSelect: 'none' }} className="checkbox-label">Personal Filament</span>
              </label>}
              <br />
              {
                files && files.split(',').map((link, index) => {
                  if (link.trim().startsWith('https://')) {
                    return (<button className='printer-btn' key={index} onClick={() => window.location.href = getDirectDownloadLink(link.trim())}>
                      Download File {index + 1}
                    </button>)
                  } else {
                    return ('')
                  }
                })
              }
            </div>}

            {selectedPrinter && (selectedPrinter.status === "broken") && isAdmin && <div>
              <button onClick={() => { handlePrinterStatusChange("available") }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>Printer Available</button>
              <button onClick={() => { handlePrinterStatusChange("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>Testing Printer</button>
              <button onClick={() => { handlePrinterStatusChange("admin") }} style={{ backgroundColor: "rgba(100, 180, 100, 0.8)" }} className='printer-btn'>Admin Printer</button>
            </div>}

            {selectedPrinter && (selectedPrinter.status === "testing") && isAdmin && <div>
              <button onClick={() => { handlePrinterStatusChange("available") }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>Printer Available</button>
              <button onClick={() => { handlePrinterStatusChange("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>Printer Broke</button>
              <button onClick={() => { handlePrinterStatusChange("admin") }} style={{ backgroundColor: "rgba(100, 180, 100, 0.8)" }} className='printer-btn'>Admin Printer</button>
            </div>}

            {/* End printer status pages */}

            {selectedPrinter && isAdmin && (printerNotes === null) && <div>
              <div className='notes-msg'>
                <strong>-- Printer Status Notes --</strong><br /> {selectedPrinter.notes ? selectedPrinter.notes : "This printer has no notes."}
              </div>
              <button onClick={() => { handleEditPrinterNotesClick() }} style={{ marginTop: '10px', cursor: 'pointer', padding: '2px 5px' }}>Edit Notes</button>
            </div>}

            {selectedPrinter && isAdmin && printerNotes !== null && <div>
              <div className='notes-msg'>
                <strong>Printer Status Notes</strong><br />
                <textarea value={printerNotes} type="text" onChange={handlePrinterNotes} style={{ width: '400px', height: '60px', fontSize: 'large', maxWidth: '95%', maxHeight: '200px' }}></textarea>
              </div>
              <button onClick={() => { updatePrinterNotes() }} style={{ marginTop: '10px', cursor: 'pointer', padding: '2px 5px' }}>Save Notes</button>
            </div>}

            <div style={{ height: "50px" }}></div>

            {
              selectedPrinter.filamentType === 'Resin' && <div>
                <div className="print-history" style={{ marginTop: '20px' }}>Resin Printing Queue [{historyList.filter(item => item.status === 'queued').length}/5]</div>

                <div className='wrapper-wrapper'>
                  <table className='history-wrapper'>
                    <thead>
                      <tr>
                        {isAdmin && <th>Delete</th>}
                        {isAdmin && <th>Edit</th>}
                        <th>Time Queued</th>
                        <th>Parts</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Supervisor</th>
                        <th>Usage (ml)</th>
                        <th>Notes</th>
                        <th>Files</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((job) => {
                        const containsSearch = Object.keys(job).some(key => {
                          let value = job[key]
                          if (key === 'timeStarted') {
                            value = formatDate(value, true)
                          } else if (key === 'personalFilament') {
                            value = value ? 'personal' : 'club'
                          } else if (key === 'usage_g') {
                            value = value.toString()
                            console.log(value)
                          }
                          return (typeof value === 'string' && value.toLowerCase().includes(historySearch.toLowerCase()))
                        }
                        );
                        if (!containsSearch) {
                          return null;
                        }

                        return <tr className={`${job.status} history-row`} key={job.jobID}>
                          {createHistoryRow(job, true)}
                        </tr>
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            }

            <div style={{ height: "100px" }}></div>

            <div className="print-history">
              <div style={{ margin: '0px', padding: '0px' }}>Print History [{historyList.length - historyList.filter(item => item.status === 'queued').length}]</div>
              <div className="search-bar">
                Search:&nbsp;
                <input type="text" value={historySearch} onChange={handleHistorySearch}></input>
                <button style={{ cursor: 'pointer' }} onClick={() => setHistorySearch('')}>Clear</button>
              </div>
            </div>
            <div style={{ height: '70vh', overflow: 'hidden' }}>
              <div className='wrapper-wrapper'>
                <table className='history-wrapper'>
                  <thead>
                    <tr>
                      {isAdmin && <th>Delete</th>}
                      {isAdmin && <th>Edit</th>}
                      <th>Time Started</th>
                      <th>Status</th>
                      <th>Parts</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Supervisor</th>
                      <th>Filament</th>
                      <th>Used {selectedPrinter.filamentType === 'Resin' ? '(ml)' : '(g)'}</th>
                      <th>Notes</th>
                      <th>Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((job) => {
                      const containsSearch = Object.keys(job).some(key => {
                        let value = job[key]
                        if (key === 'timeStarted') {
                          value = formatDate(value, true)
                        } else if (key === 'personalFilament') {
                          value = value ? 'personal' : 'club'
                        } else if (key === 'usage_g') {
                          value = value.toString()
                          console.log(value)
                        }
                        return (typeof value === 'string' && value.toLowerCase().includes(historySearch.toLowerCase()))
                      }
                      );
                      if (!containsSearch || job.status === 'queued') {
                        return null;
                      }

                      return <tr className={`${job.status} history-row`} key={job.jobID}>
                        {createHistoryRow(job)}
                      </tr>
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ height: '3vh' }} />


            <div className='printer-header' style={{
              left: `calc(${sidebarWidth}px + (100% - ${sidebarWidth}px) / 4)`, width: `calc((100% - ${sidebarWidth}px)/2)`,
              backgroundColor: `${getStatusColor(selectedPrinter.status)}`
            }}>
              {selectedPrinter.printerName} - {selectedPrinter.model}
            </div>
          </div>}
          <div className="header" style={{ left: `${sidebarWidth + 3}px`, width: `calc(100vw - ${sidebarWidth}px)` }}>
            <h1>{isAdmin ? '3DPC - Print Manager - Admin' : '3DPC - Print Manager'}</h1>
          </div>

        </div>
        {menuOpen ? (
          <div className='menuBG visible' style={{ left: `${sidebarWidth + 2}px`, width: `calc(100vw - ${sidebarWidth}px)` }}>
            {
              <Settings sidebarWidth={sidebarWidth} adminPswd={adminPswd} handlePswdChange={handlePswdChange}
                isAdmin={isAdmin} checkPswd={checkPswd} feedbackSubject={feedbackSubject} feedbackText={feedbackText}
                handleFeedbackSubjectChange={handleFeedbackSubjectChange} handleFeedbackTextChange={handleFeedbackTextChange}
                handleFeedbackClick={handleFeedbackClick} handleIsAdminChange={handleIsAdminChange} />
            }
          </div>
        ) :
          (
            <div className='menuBG hidden' style={{ left: `${sidebarWidth + 2}px`, width: `calc(100vw - ${sidebarWidth}px)` }}>
              <Settings sidebarWidth={sidebarWidth} adminPswd={adminPswd} handlePswdChange={handlePswdChange}
                isAdmin={isAdmin} checkPswd={checkPswd} feedbackSubject={feedbackSubject} feedbackText={feedbackText}
                handleFeedbackSubjectChange={handleFeedbackSubjectChange} handleFeedbackTextChange={handleFeedbackTextChange}
                handleFeedbackClick={handleFeedbackClick} handleIsAdminChange={handleIsAdminChange} />
            </div>
          )}

        {
          messageQueue.map(({ id, msg, type }, index) => {
            return (
              <div style={{ top: `${10 + (index * 60) + (getWarningsBeforeIndex(index) * 85)}px`, whiteSpace: 'pre-line' }} key={id} className={`${type}-msg`}>{msg}<ExitIcon className="msg-exit" onClick={() => handleMsgExit(id)}></ExitIcon>
                {(type === 'warn') && <div className="warning-content">
                  <div onClick={() => { handleWarningClick(id) }} style={{ backgroundColor: "rgb(118, 152, 255)" }} className='printer-btn'>Continue</div>
                </div>}
              </div>
            )
          })
        }
      </div>
    </div>
  );

}

export default App;
