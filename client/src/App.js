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

  const [sidebarWidth, setSidebarWidth] = useState(250); // Initial sidebar width
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

  const [message, setMessage] = useState('');
  const [showErr, setShowErr] = useState(false);
  const [showMsg, setShowMsg] = useState(false);
  const [showWarn, setShowWarn] = useState(false);

  //Printer menu data
  const [curJob, setCurJob] = useState(null)
  const [historyList, setHistoryList] = useState([]);

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
      handlePrinterStatusChange('available')
    }).catch(error => {
      console.error('Error:', error);
    });
  }


  //fill data arrays on the initial render
  useEffect(() => {
    try {
      Axios.get(`${serverURL}/api/get`).then((response) => {
        console.log(response);
        console.log("setting printers to data: ", response.data.printers);

        setPrinterList(response.data.printers);

      });
    } catch (error) {
      console.error("Error fetching printer data: ", error);
    }

  }, [serverURL]);

  //update the printer screen when selectedPrinter changes
  useEffect(() => {
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
    console.log(selectedPrinter)
    //Update the data that is shown
    if (selectedPrinter !== null && selectedPrinter !== undefined) {
      console.log('selectedPrinter exists')
      //get data from the database
      try {
        if (selectedPrinter.currentJob !== "" && selectedPrinter.currentJob !== null) {
          //get the current job and store it
          Axios.get(`${serverURL}/api/getjob?jobID=${selectedPrinter.currentJob}`).then((response) => {
            console.log('got current job');
            console.log(response.data.res);
            setCurJob(response.data.res[0]);
          });
        } else {
          setCurJob(null)
        }
        Axios.get(`${serverURL}/api/getHistory?printerName=${selectedPrinter.printerName}`).then((response) => {
          setHistoryList(response.data.historyList.sort((a, b) => new Date(b.timeStarted) - new Date(a.timeStarted)));
        });

      } catch (error) {
        console.error("Error fetching printer data: ", error);
      }
    } else {
      try {
        Axios.get(`${serverURL}/api/getfreq`).then((response) => {
          console.log("frequencies: ");
          console.log(response.data);
          const sortedData = response.data.res.sort((a, b) => b.cnt - a.cnt);

          setPrinterNames(sortedData.map(printer => printer.printerName));
          setFrequencies(sortedData.map(printer => printer.cnt));
          setFilamentSum(sortedData.map(printer => printer.sum));

          try {
            Axios.get(`${serverURL}/api/getsupervisordata`).then((response) => {
              console.log('supervisor data:')
              const sortedData = response.data.res.sort((a, b) => b.cnt - a.cnt);
              setSupervisorData(sortedData);
              console.log(sortedData)
              Axios.get(`${serverURL}/api/getfilamentdata`).then((response) => {
                console.log('filament name data:')
                setNameFilamentData(response.data.res);
                console.log(response.data.res)

                Axios.get(`${serverURL}/api/getdailyprints`).then((response2) => {
                  console.log("daily data:");
                  console.log(response2.data);
                  if (lineRef1.current && response2.data) {

                    const dailyData = response2.data.res;
                    const startDate = dailyData.length > 0 ? dailyData[0].date : null;
                    const endDate = dailyData.length > 0 ? dailyData[dailyData.length - 1].date : null;

                    if (startDate && endDate) {
                      const allDates = generateDateRange(startDate, endDate);
                      const dataMap = new Map(dailyData.map(day => [formatDate(day.date, false), day.cnt]));
                      // Fill in missing dates with 0
                      const filledDailyCnt = allDates.map(date => dataMap.get(date) || 0);
                      // Destroy existing chart if it already exists
                      if (lineRef1.current.chart) {
                        lineRef1.current.chart.destroy();
                      }

                      // Create the line chart
                      const ctx = lineRef1.current.getContext('2d');
                      lineRef1.current.chart = new Chart(ctx, {
                        type: 'line',
                        data: {
                          labels: allDates,
                          datasets: [{
                            label: 'Prints Completed',
                            data: filledDailyCnt,
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
                  }
                  if (lineRef2.current && response2.data) {

                    const dailyData = response2.data.res;
                    const startDate = dailyData.length > 0 ? dailyData[0].date : null;
                    const endDate = dailyData.length > 0 ? dailyData[dailyData.length - 1].date : null;

                    if (startDate && endDate) {
                      const allDates = generateDateRange(startDate, endDate);
                      const dataMap = new Map(dailyData.map(day => [formatDate(day.date, false), day.sum]));
                      // Fill in missing dates with 0
                      const filledDailyCnt = allDates.map(date => dataMap.get(date) || 0);
                      // Destroy existing chart if it already exists
                      if (lineRef2.current.chart) {
                        lineRef2.current.chart.destroy();
                      }

                      // Create the line chart
                      const ctx = lineRef2.current.getContext('2d');
                      lineRef2.current.chart = new Chart(ctx, {
                        type: 'line',
                        data: {
                          labels: allDates,
                          datasets: [{
                            label: 'Filament Used',
                            data: filledDailyCnt,
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
      case "available": return "#1ecb60";
      case "busy": return "rgb(225, 225, 40)";
      case "broken": return "rgb(246, 97, 97)";
      case "testing": return "rgb(255,255,255)"
      default: return "silver";
    }
  }

  const getStatMsg = () => {
    if (selectedPrinter.status === 'busy' && curJob) {
      return ("This printer is busy printing: " + truncateString(curJob.partNames, 80))
    } else if (selectedPrinter.status === 'available') {
      return ("This printer is available!")
    } else if (selectedPrinter.status === 'broken') {
      return ("This printer is broken.. (0_0)")
    } else if (selectedPrinter.status === 'testing') {
      return ("This printer is currently in testing, and is not available to print on.")
    } else {
      return ("")
    }
  }
  const checkPswd = (given, actual) => {
    const hash = CryptoJS.SHA256(given).toString();
    console.log('given pswd: ' + hash)
    console.log('actual pswd: ' + actual)
    if (hash === actual) {
      showMsgForDuration("Logged in as Admin!", popupTime);
      handleIsAdminChange(true)
      console.log('logged in as admin')
    } else {
      showErrForDuration("Password  Incorrect.", popupTime);
      console.log('incorrect admin password')
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
          case 'Enter':
            handleStartPrintClick();
            break;
          case 'Backspace':
            selectPrinter(null)
            break;
          case 'ArrowLeft':
            movePrinter(-1);
            break;
          case 'ArrowRight':
            movePrinter(1);
            break;
          default:
        }
      } else {
        if (e.key === 'Backspace') {
          setMenuOpen(false)
        }
      }
    } else if (menuOpen && e.key === 'Enter') {
      if (e.target.id === "adminInput") {
        checkPswd(adminPswd, process.env.REACT_APP_ADMIN_PSWD)
      } else if (e.target.id === "subjectInput" || e.target.id === "feedbackInput") {
        handleFeedbackClick();
      }
    }
  }

  const handleFeedbackClick = () => {
    if (feedbackSubject.length > 0) {
      showErrForDuration("No Feedback Subject! Not sent.",popupTime)
    } else if (feedbackText.length > 0) {
      showErrForDuration("No Feedback Text! Not sent.",popupTime)
    }else {
      sendMail('3DPC PrintManager Feedback - ' + feedbackSubject, feedbackText, "thomp907@purdue.edu")
      setFeedbackSubject('')
      setFeedbackText('')
    }
  }

  const movePrinter = (direction) => {
    console.log('moving printer by arrow key...')
    console.log(selectedPrinter)
    if (selectedPrinter === null) {
      selectPrinter(printerList[0]);
      return;
    }
    try {
      let curIndex = printerList.findIndex(printer => printer.printerName === selectedPrinter.printerName);
      curIndex = (curIndex + direction) % printerList.length;
      if (curIndex === -1) curIndex = printerList.length - 1;
      selectPrinter(printerList[curIndex]);
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
      setPrinterList(updatedPrinterList);
      selectedPrinter.status = statusArg;
      //  let selectedBtn = Array.from(document.getElementsByClassName('sidePrinter')).filter(node => node.innerHTML.startsWith(selectedPrinter.printerName))[0]
      //  selectedBtn.click()
    });
  };

  const printerChangeWhileBusy = (statusArg) => {
    handlePrintDoneClick("failed", () => {
      handlePrinterStatusChange(statusArg);
    });
  };

  const handleStartPrintClick = () => {
    if (selectedPrinter !== null) {
      //check for incorrect or empty values
      if (selectedPrinter.status !== 'available') {
        showErrForDuration("This printer is not available!", popupTime);
      } else if (name.length === 0) {
        console.log("startPrintClick: err: no name");
        showErrForDuration("No Name! Print not started.", popupTime);
      } else if ((email.length === 0) && !supervisorPrint) {
        console.log("startPrintClick: err: no email");
        showErrForDuration("No Email! Print not started.", popupTime);
      } else if ((supervisor.length === 0) && !supervisorPrint) {
        console.log("startPrintClick: err: no supervisor");
        showErrForDuration("No Supervisor! Print not started.", popupTime);
      } else if ((partNames.length === 0) && !supervisorPrint) {
        console.log("startPrintClick: err: no partNames");
        showErrForDuration("No Part Names! Print not started.", popupTime);
      }// else if (files.length === 0) {
      //   console.log("startPrintClick: err: no files");
      //   showErrForDuration("No Files! Print not started.", popupTime);
      // }
      else if ((filamentUsage === 0) || (filamentUsage === "")) {
        console.log("startPrintClick: err: no filamentUsage");
        showErrForDuration("No Filament Usage! Print not started.", popupTime);
      } else if (filamentUsage > 1000) {
        console.log("startPrintClick: warn: filamentUsage > 1000g");
        showWarningForDuration("Warning: Filament Usage Exceeds 1kg", popupTime);
      } else {
        //all fields have valid values, insert the print to the "printJob" table
        console.log("startPrintClick: all fields valid, inserting to printJob");
        startPrint();
      };
    };
  };

  const handleWarningClick = () => {
    setShowWarn(false);
    startPrint();
  }

  const startPrint = () => {
    try {
      Axios.post(`${serverURL}/api/insert`, {
        printerName: selectedPrinter.printerName,
        files: truncateString(files, 512),
        usage_g: Math.round(parseFloat(filamentUsage)) > 2147483647 ? 2147483647 : Math.round(parseFloat(filamentUsage)),
        timeStarted: new Date().toISOString(),
        status: "active",
        name: truncateString(name, 64),
        supervisor: supervisorPrint ? truncateString(name, 64) : truncateString(supervisor, 64),
        notes: truncateString(notes, 256),
        partNames: truncateString(partNames, 256),
        email: truncateString(email, 64),
        personalFilament: personalFilament
      }).then(() => {
        setTimeout(() => {
          //update the current job of the printer that was selected for the print
          try {
            Axios.get(`${serverURL}/api/getCurrentJob?printerName=${selectedPrinter.printerName}`).then((response) => {
              console.log("CurrentJob data: ");
              console.log(response.data);
              //update the printer status of the printer that was given the job
              updateTable("printer", "status", selectedPrinter.printerName, "busy", () => {
                //update the currentJob of the printer that was used for the printJob
                if (response.data.currentJob[0]) {
                  updateTable("printer", "currentJob", selectedPrinter.printerName, response.data.currentJob[0].jobID, () => {
                    const updatedPrinterList = printerList.map(printer => {
                      if (printer.printerName === selectedPrinter.printerName) {
                        let newPrinter = { ...printer, status: "busy", currentJob: response.data.currentJob[0].jobID }
                        selectPrinter(newPrinter)
                        return newPrinter;
                      }
                      return printer;
                    });
                    setPrinterList(updatedPrinterList);
                  });
                }
              });
            });
          } catch (error) {
            console.error("Error fetching printer data: ", error);
          }
        });
      }, 500)
    } catch (error) {
      console.error('Error submitting printJob: ', error);
    }

    //lastly, clear the fields of the text input and filament selected
    clearFields();
    console.log('selectedPrinter');


    console.log(selectedPrinter);

    //close error message if its still open
    setShowErr(false);

    showMsgForDuration(`Print job successfully started!`, popupTime);
  };

  const sendMail = (subject, text, target=curJob.email,) => {
    Axios.post(`${serverURL}/api/send-email`, {
      to: target,
      subject: subject,
      text: text
    }).then(() => {
      showMsgForDuration('Email Sent Successfully', popupTime);
      console.log('Email sent successfully');
    }).catch((error) => {
      showErrForDuration('Error Sending Email', popupTime);
      console.error('Error sending email:', error.response ? error.response.data : error.message);
    });
  }


  const handlePrintDoneClick = (statusArg, callback) => {
    try {
      console.log("print done was clicked... setting printer status to available");
      //set status to available
      updateTable("printer", "status", selectedPrinter.printerName, "available", () => {

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
                return { ...printer, status: "available", currentJob: "" };
              }
              return printer;
            });
            setPrinterList(updatedPrinterList);
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
                        showErrForDuration(`Email not sent. Failures: ${failureCount}`, popupTime);
                      }
                    });
                  } catch (error) {
                    console.error("Error fetching failure count: ", error);
                  }
                }

              } catch (e) {
                showErrForDuration('Error Sending Email', popupTime);
                console.log('Error sending email:', e);
              }
            } else {
              console.log('not sending email...')
              showErrForDuration('No Email Sent. (Disabled)', popupTime);
            }

            selectedPrinter.status = 'available'
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

  const showErrForDuration = (msg, duration) => {
    setShowWarn(false);
    setShowMsg(false);
    setMessage(msg);
    if (!showErr) {
      setShowErr(true);
      setTimeout(() => {
        setShowErr(false);
      }, duration);
    }
  };

  const handleMsgExit = () => {
    setShowWarn(false);
    setShowMsg(false);
    setShowErr(false);
  }

  const showWarningForDuration = (msg, duration) => {
    setShowErr(false);
    setShowMsg(false);
    setMessage(msg);
    if (!showWarn) {
      setShowWarn(true);
      setTimeout(() => {
        setShowWarn(false);
      }, duration);
    }
  };

  const showMsgForDuration = (msg, duration) => {
    console.log(msg)
    setShowWarn(false);
    setShowErr(false);
    setMessage(msg);
    if (!showMsg) {
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

  const fillFromSheets = (e) => {
    try {
      const url = 'https://script.google.com/macros/s/AKfycbwdMweriskP6srd5gir1qYlA3jRoTxA2YiHcbCt7555LoqBs_BZT-OfKUJiP53kihQV/exec';
      fetch(url).then(response => response.json()).then(data => {
        if (data !== null && data.length > 0) {
          console.log('fetched form data: ');
          console.log(data)
          showMsgForDuration('Form Filled Successfully!', popupTime);

          let formData = data[0];
          // fill the form's fields with the data we just pulled...
          setname(formData[1]);
          setemail(formData[2]);
          setsupervisor(formData[10])
          setfiles(formData[4]);
          setnotes(formData[8]);
          setpartnames(formData[9]);
        } else {
          showErrForDuration('Error Filling Form...', popupTime);
        }
      });
    } catch (e) {
      showErrForDuration('Error Filling Form...', popupTime);
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

  return (
    <div className="App">
      <Sidebar printerList={printerList} handlePrinterClick={handlePrinterClick} selectedPrinter={selectedPrinter}
        handleOpenMenu={handleOpenMenu} menuOpen={menuOpen} selectPrinter={selectPrinter} width={sidebarWidth} getStatusColor={getStatusColor} />

      <div id="resizer" onMouseDown={handleMouseDown} style={{ marginLeft: `${sidebarWidth - 1}px` }}></div>

      <div className='main-content' style={{ marginLeft: `${sidebarWidth}px` }}>
        <div style={{ height: selectedPrinter ? '100px' : '65px' }}></div>

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
            <div className='stat-msg'>{
              getStatMsg()
            }</div>
            <br />
            {
              (curJob && selectedPrinter.status === 'busy') &&
              <div>
                <div className='stat-msg info' style={{ backgroundColor: 'white', textAlign: 'left' }}>
                  &nbsp;Name: {curJob.name}
                  <hr style={{ borderTop: '2px solid black', width: '100%', marginTop: '5px' }} />
                  &nbsp;Email: {curJob.email}
                  <hr style={{ borderTop: '2px solid black', width: '100%', marginTop: '5px' }} />
                  &nbsp;Supervisor: {curJob.supervisorName}
                  <hr style={{ borderTop: '2px solid black', width: '100%', marginTop: '5px' }} />
                  &nbsp;Files: {curJob.files}
                  <hr style={{ borderTop: '2px solid black', width: '100%', marginTop: '5px' }} />
                  &nbsp;Notes: {curJob.notes}
                </div>
                {/* Checkbox to toggle email sending */}
                <label
                  className={`checkbox-container ${sendEmail ? 'active' : ''}`}>
                  <input type="checkbox" checked={sendEmail} onChange={handleSendEmailChange} />
                  <span className="custom-checkbox"></span>
                  <span style={{ userSelect: 'none' }} className="checkbox-label">Send Email</span>
                </label>
              </div>
            }

            {(selectedPrinter.status === "busy") && <div>
              <button onClick={() => { handlePrintDoneClick("completed", null) }} style={{ backgroundColor: "rgba(100, 246, 100,0.8)" }} className='printer-btn'>Print Done</button>
              <button onClick={() => { handlePrintDoneClick("failed", null) }} style={{ backgroundColor: "rgba(246, 155, 97,0.8)" }} className='printer-btn'>Print Failed</button>
              <button onClick={() => { printerChangeWhileBusy("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>Printer Broke</button>
              <button onClick={() => { printerChangeWhileBusy("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>Testing Printer</button>
              <button onClick={() => { cancelPrint() }} style={{ backgroundColor: 'rgba(118, 152, 255,0.8)' }} className='printer-btn'>Cancel Print</button>
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
            </div>}

            {selectedPrinter && (selectedPrinter.status === "available") && <div>
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
              <button onClick={() => { handleStartPrintClick() }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>Start Print</button>
              <button onClick={() => { handlePrinterStatusChange("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>Printer Broke</button>
              <button onClick={() => { handlePrinterStatusChange("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>Testing Printer</button>
              <button onClick={() => { clearFields() }} style={{ backgroundColor: 'rgba(118, 152, 255,0.8)' }} className='printer-btn'>Clear Form</button>
              <br />
              {/* Checkbox to toggle supervisor print */}
              <label
                className={`checkbox-container ${supervisorPrint ? 'active' : ''}`}>
                <input type="checkbox" checked={supervisorPrint} onChange={handleSupervisorPrintChange} />
                <span className="custom-checkbox"></span>
                <span style={{ userSelect: 'none' }} className="checkbox-label">Supervisor Print</span>
              </label>
              {/* Checkbox to toggle personal filament */}
              <label
                className={`checkbox-container ${personalFilament ? 'active' : ''}`}>
                <input type="checkbox" checked={personalFilament} onChange={handlePersonalFilamentChange} />
                <span className="custom-checkbox"></span>
                <span style={{ userSelect: 'none' }} className="checkbox-label">Personal Filament</span>
              </label>
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

            {selectedPrinter && (selectedPrinter.status === "broken") && <div>
              <button onClick={() => { handlePrinterStatusChange("available") }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>Printer Available</button>
              <button onClick={() => { handlePrinterStatusChange("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>Testing Printer</button>
            </div>}

            {selectedPrinter && (selectedPrinter.status === "testing") && <div>
              <button onClick={() => { handlePrinterStatusChange("available") }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>Printer Available</button>
              <button onClick={() => { handlePrinterStatusChange("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>Printer Broke</button>
            </div>}

            <div style={{ height: "50px" }}></div>
            <div className="print-history">Print History [{historyList.length}]</div>
            <div className='wrapper-wrapper'>
              <table className='history-wrapper'>
                <thead>
                  <tr>
                    <th>Time Started</th>
                    <th>Status</th>
                    <th>Parts</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Supervisor</th>
                    <th>Used (g)</th>
                    <th>Files</th>
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
                      <td>{formatDate(job.timeStarted, true)}</td>
                      <td>{job.status}</td>
                      <td>{truncateString(job.partNames, 40)}</td>
                      <td>{truncateString(job.name, 20)}</td>
                      <td>{truncateString(job.email, 30)}</td>
                      <td>{truncateString(job.supervisorName, 20)}</td>
                      <td>{job.usage_g}</td>
                      <td>{truncateString(job.files, 256)}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ height: '10vh' }} />


            <div className='printer-header' style={{
              left: `calc(${sidebarWidth}px + (100% - ${sidebarWidth}px) / 4)`, width: `calc((100% - ${sidebarWidth}px)/2)`,
              backgroundColor: `${getStatusColor(selectedPrinter.status)}`
            }}>
              {selectedPrinter.printerName} - {selectedPrinter.model}
            </div>
          </div>}
          <div className="header" style={{ left: `${sidebarWidth + 3}px`, width: `calc(100vw - ${sidebarWidth}px)` }}>
            <h1>3DPC - Print Manager</h1>
          </div>

        </div>
        {menuOpen ? (
          <div className='menuBG active' style={{ left: `${sidebarWidth + 2}px`, width: `calc(100vw - ${sidebarWidth}px)` }}>
            {
              <Settings sidebarWidth={sidebarWidth} adminPswd={adminPswd} handlePswdChange={handlePswdChange}
                isAdmin={isAdmin} checkPswd={checkPswd} feedbackSubject={feedbackSubject} feedbackText={feedbackText} 
                handleFeedbackSubjectChange={handleFeedbackSubjectChange} handleFeedbackTextChange={handleFeedbackTextChange}
                handleFeedbackClick={handleFeedbackClick}/>
            }
          </div>
        ) :
          (
            <div className='menuBG hidden' style={{ left: `${sidebarWidth + 2}px`, width: `calc(100vw - ${sidebarWidth}px)` }}>
              <Settings sidebarWidth={sidebarWidth} adminPswd={adminPswd} handlePswdChange={handlePswdChange}
                isAdmin={isAdmin} checkPswd={checkPswd} feedbackSubject={feedbackSubject} feedbackText={feedbackText} 
                handleFeedbackSubjectChange={handleFeedbackSubjectChange} handleFeedbackTextChange={handleFeedbackTextChange}
                handleFeedbackClick={handleFeedbackClick}/>
            </div>
          )}
        {showErr && <div className="err-msg">{message}<ExitIcon className="msg-exit" onClick={handleMsgExit}></ExitIcon></div>}
        {showMsg && <div className="success-msg">{message}<ExitIcon className="msg-exit" onClick={handleMsgExit}></ExitIcon></div>}
        {showWarn && <div style={{ paddingBottom: '10px' }} className="warning-msg"><ExitIcon className="msg-exit" onClick={handleMsgExit}></ExitIcon>
          <div className="warning-content">
            {message}<br></br>Continue anyway?
            <div onClick={() => { handleWarningClick() }} style={{ backgroundColor: "rgb(118, 152, 255)" }} className='printer-btn'>Continue</div>
          </div>
        </div>}
      </div>
    </div>
  );
}

export default App;
