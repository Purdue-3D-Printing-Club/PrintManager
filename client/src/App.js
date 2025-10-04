import Axios from 'axios';
import CryptoJS from 'crypto-js';
import React, { useEffect, useRef, useState } from 'react';
import { Pie } from 'react-chartjs-2';
import './App.css';
import exitIcon from '/images/cancel.svg';
import searchIcon from '/images/search.svg'

import loadingGif from '/images/loading.gif'
import xIcon from '/images/x.png'

import TrendingPrints from './TrendingPrints'
import StlPreview from './StlPreview';
import Settings from './Settings';
import Sidebar from './Sidebar';
import PrintForm from './PrintForm';
import LineChart from './LineChart';
import ErrorBoundary from './ErrorBoundary';


function App() {
  const statusIconFolder = '/images/statusIcons'
  // const SPECIAL_FILAMENT_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbziM-dySFGyjXCtK9cWPntqvg8lFSVJPcJ9CjI7Vm5mJhTmyIbvZh7Wbht44pmfnwzoww/exec'
  // const MAIN_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMTIphmSEMiWof46LvuMCZYyONi3wqAbaxzjKXTFxQ8gNQd84Wzct7GsidBwQjyQld/exec'

  const [serverURL, setServerURL] = useState(" http://localhost:3001");// tailscale remote http://100.68.78.107
  const [organizerLinks, setOrganizerLinks] = useState({});

  const [sidebarWidth, setSidebarWidth] = useState(250); // Initial sidebar width set to 250
  const minSidebarWidth = 180;
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [formData, setFormData] = useState(null)
  const [filamentUsage, setFilamentUsage] = useState('');
  const [name, setname] = useState('');
  const [email, setemail] = useState('');
  const [supervisor, setsupervisor] = useState('');
  const [files, setfiles] = useState('');
  const [filesPlaceholder, setFilesPlaceholder] = useState('Google Drive Links')
  const [notes, setnotes] = useState('');
  const [partNames, setpartnames] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [supervisorPrint, setSupervisorPrint] = useState(false);
  const [personalFilament, setPersonalFilament] = useState(false);

  const [selectedPrinter, selectPrinter] = useState(null);
  const [moveSelect, setMoveSelect] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [adminPswd, setAdminPswd] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackText, setFeedbackText] = useState('');

  const [printerList, setPrinterList] = useState([]);
  const [memberList, setMemberList] = useState([]);

  const printerRefs = useRef([]);

  const [printerNotes, setPrinterNotes] = useState(null);
  const [printerSort, setPrinterSort] = useState('Availability');

  const [messageQueue, setMessageQueue] = useState([]);

  //Printer menu data
  const [formDataLoading, setFormDataLoading] = useState(false);

  const [curJob, setCurJob] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyPeriod, setHistoryPeriod] = useState({ year: 2025, seasonEnc: 2 }); // season encoding: 0-Spring, 1-Summer, 2-Fall
  const seasonUpperBounds = [new Date(2000, 4, 20), new Date(2000, 7, 20), new Date(2000, 11, 31)] // The upper bounds for each season, assuming normalized year of 2000.

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

  //

  //summary page data
  const [recentFiles, setRecentFiles] = useState([]);
  const [dailyPrint, setDailyPrint] = useState([]);
  const [potdStatus, setPotdStatus] = useState('loading')
  const hasFetchedDailyPrint = useRef(false);

  const [showSTLPreviews, setShowSTLPreviews] = useState(true)
  const [printerNames, setPrinterNames] = useState([]);
  const [frequencies, setFrequencies] = useState([]);
  const [supervisorData, setSupervisorData] = useState([]);
  const [nameFilamentData, setNameFilamentData] = useState([]);
  const [filamentSum, setFilamentSum] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loading, setLoading] = useState('loading')

  const [linePersonalData, setLinePersonalData] = useState([]);
  const [lineClubData, setLineClubData] = useState([]);
  const [lineDateWindow, setLineDateWindow] = useState([]);

  const popupTime = 8000;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  context.font = "16pt Trebuchet MS";

  // const getFilenameFromLink = async (link) => {
  //   try {
  //     Axios.get(`${serverURL}/api/getFileName?link=${link}`).then((response) => {
  //       console.log('Got filename from server:', response);
  //       return response.filename;
  //     }).catch(error => {
  //       console.error("Error getting filename from: ", error);
  //     });
  //   } catch (error) {
  //     console.error("Error getting filename from: ", error);
  //   }
  // }

  const openToBusy = (status) => {
    return status === 'admin' ? 'admin-busy' : status === 'testing' ? 'testing-busy' : 'busy'
  }
  const busyToOpen = (status) => {
    return status === 'admin-busy' ? 'admin' : status === 'testing-busy' ? 'testing' : 'available'
  }

  const mapStatusToIcon = (status) => {
    if (selectedPrinter.status?.slice(-4) === "busy") {
      return `${statusIconFolder}/busy.svg`;
    } if (selectedPrinter.status === 'available') {
      return `${statusIconFolder}/available.svg`;
    } if (selectedPrinter.status === 'admin') {
      if (isAdmin) {
        return `${statusIconFolder}/available.svg`;
      } else {
        return `${statusIconFolder}/admin.svg`;
      }
    } if (selectedPrinter.status === 'broken') {
      return `${statusIconFolder}/broken.svg`;
    }
    // testing status included
    return `${statusIconFolder}/testing.svg`;
  }

  const getStatMsgColor = () => {
    if (selectedPrinter.status === 'busy') {
      return 'rgb(249, 249, 202)';
    } if (selectedPrinter.status === 'admin-busy') {
      return 'rgb(253, 253, 180)';
    } if (selectedPrinter.status === 'testing-busy') {
      return 'rgba(241, 241, 241, 1)';
    } if (selectedPrinter.status === 'available') {
      return 'rgb(223, 251, 222)';
    } if (selectedPrinter.status === 'admin') {
      return 'rgb(186, 234, 184)';
    } if (selectedPrinter.status === 'broken') {
      return 'rgb(251, 230, 230)';
    }
    // testing status included
    return 'rgb(255, 255, 255)';
  }

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
      Axios.get(`${serverURL}/api/get?query=${"SELECT * FROM printer"}`).then((response) => {
        console.log(response);

        const sorted = sortPrinterList(response.data.result, printerSort)
        setPrinterList(sorted);
        console.log("setting printers to data: ", sorted);
      }).catch(e => {
        console.error("Error fetching printer data: ", e)
        setLoading('error')
      });
    } catch (error) {
      console.error("Error fetching printer data: ", error);
    }

  }, [serverURL, printerSort, selectedPrinter]);

  // fill member list and update the organizer links
  useEffect(() => {
    // member list
    try {
      Axios.get(`${serverURL}/api/get?query=${"SELECT * FROM member"}`).then((response) => {
        let members = response.data.result
        console.log('member list: ', members);

        setMemberList(members);
      }).catch(e => {
        console.error('Error in fetching member list: ', e)
      });
    } catch (error) {
      console.error("Error fetching member list: ", error);
    }

    // organizer links
    try {
      Axios.get(`${serverURL}/api/getLocalData`).then((response) => {
        let localData = response.data;
        console.log('app.js got localData: ', localData);
        if (response?.data?.organizerLinks) {
          setOrganizerLinks(response.data.organizerLinks);
        } else{
          console.error('Error fetching organizer links, field does not exist!')
        }
      }).catch(e => {
        console.error('Error in fetching local data: ', e)
      });
    } catch (error) {
      console.error("Error updating from serverURL: ", error);
    }
  }, [serverURL]);



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

  useEffect(() => {
    refreshHistory();
  }, [historyPeriod])

  //update the printer screen when selectedPrinter changes
  useEffect(() => {
    console.log('updating printer screen')
    console.log('selectedPrinter: ', selectedPrinter)
    console.log('printerList: ', printerList)
    console.log('menuOpen: ', menuOpen)

    // Update the history period with the current date and refresh the history table
    let now = new Date();
    let newYear = now.getFullYear();

    let normalizedDate = now.setFullYear(2000);
    let newSeasonEnc = normalizedDate < seasonUpperBounds[0] ? 0 : normalizedDate < seasonUpperBounds[1] ? 1 : 2;
    setHistoryPeriod({ year: newYear, seasonEnc: newSeasonEnc });

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
      } catch (error) {
        console.error("Error fetching printer data: ", error);
      }
    } else {
      if (printerList.length === 0) {
        return;
      }

      // fetch recent files
      try {
        Axios.get(`${serverURL}/api/getRecentFiles`).then((response) => {
          let recentFilesTemp = response.data.recentFiles;
          recentFilesTemp.files = recentFilesTemp.files.split(',').map(file => file.trim())
          recentFilesTemp.partNames = recentFilesTemp.partNames.split(',').map(name => name.trim())

          console.log('recentFilesTemp:', recentFilesTemp)
          const newRecentFiles = recentFilesTemp.files.map((file, index) => ({
            file: file,
            name: recentFilesTemp.partNames[index] || ""
          }));

          console.log('setting new recent files: ', newRecentFiles)
          setRecentFiles(newRecentFiles)
        });
      } catch (error) {
        console.error("Error fetching recent files data: ", error);
        setLoadingSummary(false);
      }

      // fetch print of the day, but only once per page refresh!
      if (!hasFetchedDailyPrint.current) {
        hasFetchedDailyPrint.current = true;

        try {
          Axios.get(`${serverURL}/api/getDailyPrint`, { timeout: 180000 }).then((response) => {
            let dailyPrintTemp = response.data;
            // let newDailyPrint = []; 
            // for (let fileno in dailyPrintTemp) {
            //   let fileName = dailyPrintTemp[fileno].slice(dailyPrintTemp[fileno].lastIndexOf('/') + 1).trim();
            //   console.log('trending print file name: ', fileName);
            //   newDailyPrint.push({
            //     "name": fileName,
            //     "file": dailyPrintTemp[fileno]
            //   });
            // }

            console.log('setting trending print: ', dailyPrintTemp);
            setPotdStatus('done')
            // setDailyPrint({ 'parts': dailyPrintTemp, 'pageLink': response.data.pageLink, 'pageName': response.data.pageName });
            setDailyPrint(dailyPrintTemp);
          }).catch(e => {
            setPotdStatus('error')
          });
        } catch (error) {
          console.error("Error fetching print of the day: ", error);
          setLoadingSummary(false);
          setPotdStatus('error')
        }
      }


      const generateDateRange = (startDate, endDate) => {
        const dateArray = [];
        let currentDate = new Date(startDate);

        while (currentDate <= new Date(endDate)) {
          dateArray.push(formatDate(new Date(currentDate), false));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        return dateArray;
      };

      //console.log(`### loading line chart ${index}...`)
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
                    const endDate = dailyData.length > 0 ? formatDate(new Date().toISOString(), false) : null; //dailyData[dailyData.length - 1].date
                    if (startDate && endDate) {
                      const allDates = generateDateRange(startDate, endDate);

                      // store the data needed for line chart 1
                      const personalDataMap1 = new Map(personal.map(day => [formatDate(day.date, false), day.cnt]));
                      const clubDataMap1 = new Map(club.map(day => [formatDate(day.date, false), day.cnt]));

                      // Fill in missing dates with 0
                      const filledPersonalCnt = allDates.map(date => personalDataMap1.get(date) || 0);
                      const filledClubCnt = allDates.map(date => clubDataMap1.get(date) || 0);

                      //createLineChart(lineRef, filledPersonalCnt, filledClubCnt, allDates)


                      // store the data needed for line chart 2
                      const personalDataMap2 = new Map(personal.map(day => [formatDate(day.date, false), day.sum]));
                      const clubDataMap2 = new Map(club.map(day => [formatDate(day.date, false), day.sum]));

                      // Fill in missing dates with 0
                      const filledPersonalSum = allDates.map(date => personalDataMap2.get(date) || 0);
                      const filledClubSum = allDates.map(date => clubDataMap2.get(date) || 0);

                      //createLineChart(lineRef, filledPersonalSum, filledClubSum, allDates)


                      // set the useState variables to the processed data
                      setLinePersonalData([filledPersonalCnt, filledPersonalSum]);
                      setLineClubData([filledClubCnt, filledClubSum]);
                      setLineDateWindow(allDates);
                      // console.log('linePersonalData: ', filledPersonalCnt)
                      // console.log('lineClubData: ', filledClubCnt)
                      // console.log('lineDateWindow: ', allDates)
                    }
                  }
                  setLoading('done');
                });
              });
            });
          } catch (error) {
            console.error("Error getting daily stats: ", error);
            setLoading('error');
          }
          setLoadingSummary(false);
        });

      } catch (error) {
        console.error("Error fetching printer data: ", error);
        setLoading('error');
        setLoadingSummary(false);
      }
    }
  }, [selectedPrinter, serverURL, menuOpen, printerList]);


  // Add mouse event listeners to the document for resizing
  React.useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizing) {
        const newWidth = Math.max(minSidebarWidth, Math.min(e.clientX, 400));
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





  const toggleSTLPreviews = () => {
    console.log('setting STLPreviews to ', !showSTLPreviews);
    setShowSTLPreviews(!showSTLPreviews);
  }

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

  function toMySQLDate(date) {
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // fetch the printer history or, if its null, get the comprehensive history
  const refreshHistory = () => {
    console.log('historyPeriod:', historyPeriod)
    // get a start and end date from the history period
    let dateRangeString;

    if (historyPeriod.seasonEnc === 0) { // Spring
      let end = new Date(seasonUpperBounds[0])
      end.setFullYear(historyPeriod.year)

      dateRangeString = {
        startDate: toMySQLDate(new Date(historyPeriod.year, 0, 1)),
        endDate: toMySQLDate(end)
      }
    } else if (historyPeriod.seasonEnc === 1) { // Summer
      let start = new Date(seasonUpperBounds[0])
      start.setFullYear(historyPeriod.year)
      let end = new Date(seasonUpperBounds[1])
      end.setFullYear(historyPeriod.year)
      dateRangeString = {
        startDate: toMySQLDate(start),
        endDate: toMySQLDate(end)
      }
    } else if (historyPeriod.seasonEnc === 2) { // Fall
      let start = new Date(seasonUpperBounds[1])
      start.setFullYear(historyPeriod.year)
      let end = new Date(seasonUpperBounds[2])
      end.setFullYear(historyPeriod.year)
      dateRangeString = {
        startDate: toMySQLDate(start),
        endDate: toMySQLDate(end)
      }
    } else {
      console.error(`ERROR in refreshHistory: Invalid season encoding in historyPeriod of ${historyPeriod.seasonEnc}`)
    }

    console.log(dateRangeString)
    Axios.get(`${serverURL}/api/getHistory`, {
      params: {
        value: selectedPrinter?.printerName ?? 'undefined',
        field: "printerName",
        dateRangeString: JSON.stringify(dateRangeString)
      }
    }).then((response) => {
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

  // update the printer's status from active to inactive
  const activeToInactive = (refPrinter) => {
    console.log('Changing', refPrinter.printerName, 'status to inactive')

    updateTable("printer", "currentJob", refPrinter.printerName, '', () => {
      handlePrinterStatusChange(busyToOpen(refPrinter.status), refPrinter);
      saveJob();
    })
    refPrinter.currentJob = ''
  }

  const inactiveToActive = (refPrinter, editingJobFilt) => {
    console.log('Changing', refPrinter.printerName, 'status to active')
    handlePrinterStatusChange(refPrinter.status === 'admin' ? 'admin-busy' : refPrinter.status === 'testing' ? 'testing-busy' : 'busy', refPrinter);
    setCurJob(editingJobFilt);
    refPrinter.currentJob = editingJobFilt.jobID;

    //set all other active jobs to completed, then update this job to be active
    Axios.put(`${serverURL}/api/update`, {
      table: "printjob",
      column: "status",
      id: refPrinter.printerName,
      val: 'completed'
    }).then(() => {
      updateTable("printer", "currentJob", refPrinter.printerName, editingJobFilt.jobID, () => {
        saveJob();
      });
    });
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

    let refPrinter = selectedPrinter;

    // This is the comprehensive history table in the lab summary page
    if (!refPrinter) {
      console.log('No referencedPrinter, searching in printerList...')
      // look up the printer name in the printer list to use it later
      refPrinter = printerList.find(printer => printer.printerName === job.printerName);
      console.log('Found printer: ', refPrinter)

      if (!refPrinter) {
        console.log('Could not find the reference printer in printerList, edit not allowed.')
        return;
      }
    }

    // save the edits
    if (editingJobFilt.jobID === job.jobID) {
      if (!printerList.map(printer => printer.printerName).includes(editingJob.printerName)) {
        console.log('Cannot set new printer name: Printer does not exist!')
        showMsgForDuration(`Cannot save job: Printer "${editingJob.printerName}" doesn't exist!`, 'err');
        setEditingJob({ ...editingJob, jobID: -1 });
        return;
      }

      if (editingJobFilt.status !== job.status) {
        // handle different cases where the printer name was changed too, so we need different behavior
        if (job.printerName !== editingJob.printerName) {
          let destPrinter = printerList.find(printer => printer.printerName === editingJob.printerName)

          // job changed from inactive to active
          if ((editingJobFilt.status === 'active')) {
            // change only the destination printer to active
            inactiveToActive(destPrinter, editingJobFilt);
          }
          // job changed from active to inactive
          else if (job.status === 'active') {
            // change only the destination printer to inactive
            activeToInactive(refPrinter);
          } else {
            // otherwise, just save the job (no active status was changed)
            saveJob();
          }
        } else {
          // if the job was made active again, set printer status to busy
          if ((editingJobFilt.status === 'active')) {
            inactiveToActive(refPrinter, editingJobFilt);
          }
          // if the job status was changed from active, set the printer status to available or admin and reset currentJob
          else if (job.status === 'active') {
            activeToInactive(refPrinter);
          } else {
            // otherwise, just save the job (no active status was changed)
            saveJob();
          }
        }
      } else {
        console.log('status did not change')
        console.log('editingJob name: ', editingJob.printerName, ' | job name: ', job.printerName)
        // if the printer was changed, and the status is active, then we need to update the printer status of both printers
        // source -- busy to inactive   |   destination -- inactive to busy
        if ((job.printerName !== editingJob.printerName) && (job.status === 'active')) {
          console.log('active to active printer name change detected')
          let destPrinter = printerList.find(printer => printer.printerName === editingJob.printerName)
          // set the source printer to inactive
          activeToInactive(refPrinter);
          //set the destination printer to active
          inactiveToActive(destPrinter, editingJobFilt);
        } else {
          saveJob();
        }
      }
    } else {
      // change the job to edit, discard previous changes
      setEditingJob(job);
      console.log('Editing job: ', job);
    }
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
  const autofillFields = (job) => {
    setname(job.name);
    setFilamentUsage(job.usage_g);
    setemail(job.email);
    setsupervisor(job.supervisorName);
    setpartnames(job.partNames);
    setfiles(job.files);
    setnotes(job.notes);
    setSupervisorPrint(job.name === job.supervisorName);
    setPersonalFilament(job.personalFilament);
  }

  const cancelPrint = () => {
    autofillFields(curJob);
    fetch(`${serverURL}/api/cancelPrint/${selectedPrinter.printerName}/${curJob.usage_g}`, { method: 'DELETE', }).then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }).then(data => {
      updateTable("printer", "currentJob", selectedPrinter.printerName, '', () => {
        handlePrinterStatusChange(busyToOpen(selectedPrinter.status))
      })
    }).catch(error => {
      console.error('Error:', error);
    });
  }

  const movePrint = (printerName) => {
    console.log(`moving current print from ${selectedPrinter.printerName} to ${printerName}...`);

    let newPrinter = printerList.find(p => p.printerName === printerName);





    //update the new printer's status to active    
    console.log('Changing', newPrinter.printerName, 'status to active')
    handlePrinterStatusChange(newPrinter.status === 'admin' ? 'admin-busy' : 'busy', newPrinter);
    newPrinter.currentJob = curJob.jobID;

    //set all other active jobs to completed, then update this job to be active
    Axios.put(`${serverURL}/api/update`, {
      table: "printjob",
      column: "status",
      id: newPrinter.printerName,
      val: 'completed'
    }).then(() => {
      updateTable("printer", "currentJob", newPrinter.printerName, curJob.jobID, () => {
        // update the current job to point to the new printer
        Axios.put(`${serverURL}/api/update`, {
          table: "queue", // update printJob by jobID
          column: "printerName",
          id: curJob.jobID,
          val: printerName
        }).then(() => {
          // update the selected printer's status from active to inactive
          console.log('Changing', selectedPrinter.printerName, 'status to inactive')

          updateTable("printer", "currentJob", selectedPrinter.printerName, '', () => {
            handlePrinterStatusChange(busyToOpen(selectedPrinter.status), selectedPrinter);
            selectedPrinter.currentJob = ''
            setCurJob(null);
          })
        });
      });
    });
  }

  const sortPrinterList = (list, by = 'Availability') => {
    let sortedPrinters = []
    const availabilityOrder = ['available', 'admin', 'busy', 'admin-busy', 'testing-busy', 'testing', 'broken'];

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
  async function sleep(time) {
    await new Promise(resolve => setTimeout(resolve, time))
  }


  function handleCollapseSidebar() {
    setSidebarOpen(!sidebarOpen);
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
      case "available": return "rgb(104, 216, 121)";
      case "busy": return "rgb(237, 237, 80)";
      case "broken": return "rgb(255, 138, 138)";
      case "testing": return "rgb(255,255,255)";
      case "testing-busy": return "rgb(214, 214, 214)";
      case "admin": return "rgb(117, 181, 117)";
      case "admin-busy": return "rgb(220, 205, 103)";
      default: return "silver";
    }
  }

  const getStatMsg = () => {
    if ((selectedPrinter.status?.slice(-4) === 'busy') && curJob) {
      return ("This printer is busy printing: " + ((!curJob.partNames) ? 'No parts specified.' : truncateString(curJob.partNames, 80)))
    } else if (selectedPrinter.status === 'available') {
      return ("This printer is available!")
    } else if (selectedPrinter.status === 'broken') {
      return ("This printer is broken... (0_0)")
    } else if (selectedPrinter.status === 'testing') {
      return ("This printer is currently in testing.")
    } else if ((selectedPrinter.status === 'admin') && !isAdmin) {
      return ("This printer is only available for admins. Please contact an officer or lab advisor to use it.")
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
      showMsgForDuration("Logged in as Admin!", 'msg');
      handleIsAdminChange(true)
    } else {
      showMsgForDuration("Incorrect Password.", 'err');
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
          case 'ArrowUp':
            e.preventDefault();
            movePrinter(-1);
            break;
          case 'ArrowDown':
            e.preventDefault();
            movePrinter(1);
            break;
          default:
        }
        if (editingJob.jobID === -1 && e.key === 'Enter') {
          handleStartPrintClick();
        }
      } else {
        if (e.key === 'Backspace') {
          setMenuOpen(false)
        }
      }
      // runs whether menu is open or not
      if (e.key === 's') {
        handleOpenMenu();
      } else if (e.key === 'c') {
        setMessageQueue([]);
      }

    } else { //input is focused
      if (!menuOpen) {
        // if ((e.target.id === "printerNotesInput") && (e.key === 'Enter')) {
        //   updatePrinterNotes();
        // } else
        if ((editingJob.jobID !== -1) && (e.key === 'Enter')) {
          handleEditClick(editingJob);
        }
      }
    }

    if (menuOpen && (e.key === 'Enter')) {
      if (e.target.id === "adminInput") {
        checkPswd(adminPswd, import.meta.env.VITE_ADMIN_PSWD)
      } else if (e.target.id === 'URLInput') {
        setServerURL(e.target.value)
      } else if (e.target.id === "subjectInput" || e.target.id === "feedbackInput") {
        handleFeedbackClick();
      }
    }
  }

  const handleFeedbackClick = () => {
    if (feedbackSubject.length <= 0) {
      showMsgForDuration("No Feedback Subject! Not sent.", 'err')
    } else if (feedbackText.length <= 0) {
      showMsgForDuration("No Feedback Text! Not sent.", 'err')
    } else {
      sendMail('PrintManager Feedback - ' + feedbackSubject, feedbackText, "print3d@purdue.edu")
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

  function truncateStringWidth(str, maxWidth) {
    if (!str) return "";

    let truncated = "";
    for (let i = 0; i < str.length; i++) {
      const testStr = truncated + str[i];
      const metrics = context.measureText(testStr + "...");
      if (metrics.width > maxWidth) {
        return truncated + "...";
      }
      truncated = testStr;
    }
    return truncated;
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

  const handlePrinterStatusChange = (statusArg, refPrinter = selectedPrinter) => {
    console.log('changing printer ' + refPrinter.printerName + '\'s status to ' + statusArg)
    //first, update the database to have the new printer status
    updateTable("printer", "status", refPrinter.printerName, statusArg, () => {
      //then, update the local printer array to reflect this change
      const updatedPrinterList = printerList.map(printer => {
        if (printer.printerName === refPrinter.printerName) {
          return { ...printer, status: statusArg };
        }
        return printer;
      });
      setPrinterList(sortPrinterList(updatedPrinterList, printerSort));
      refPrinter.status = statusArg;
    });
  };

  const printerChangeWhileBusy = (statusArg) => {
    handlePrintDoneClick("failed", () => {
      handlePrinterStatusChange(statusArg);
    });
  };

  const releaseFromQueue = () => {
    // get the latest queued print, and if it doesnt exist, show an error popup
    let queue = historyList.filter(item => item.status === 'queued')
    let toRelease = queue[queue.length - 1]
    // edge case handling
    if ((queue.length <= 0) || !toRelease) {
      showMsgForDuration('No jobs in queue! Print not started.', 'err');
      return;
    }
    if (!((selectedPrinter.status === 'available') || (selectedPrinter.status === 'admin'))) {
      showMsgForDuration('Printer is busy! Finish current job first.', 'err');
      return;
    }

    // set the printJob status to statusArg
    Axios.put(`${serverURL}/api/update`, {
      table: "queue",
      column: "status",
      id: toRelease.jobID,
      val: 'active'
    }).then(() => {
      // add the jobID to the printer
      updateTable("printer", "currentJob", selectedPrinter.printerName, toRelease.jobID, () => {
        //update the printer status
        updateTable("printer", "status", selectedPrinter.printerName, openToBusy(selectedPrinter.status), () => {
          const updatedPrinterList = printerList.map(printer => {
            if (printer.printerName === selectedPrinter.printerName) {
              let newPrinter = {
                ...printer, status: openToBusy(selectedPrinter.status),
                currentJob: toRelease.jobID
              }
              selectPrinter(newPrinter)
              return newPrinter;
            }
            return printer;
          });
          setPrinterList(sortPrinterList(updatedPrinterList, printerSort));
          showMsgForDuration('Resin print successfully started!', 'msg')
        })
      });
    });
  }

  const handleStartPrintClick = (queue = false) => {
    let matchingJob = ''

    if (selectedPrinter !== null) {
      //check for incorrect or empty values
      if (selectedPrinter.status !== 'available' && selectedPrinter.status !== 'admin' &&
        selectedPrinter.status !== 'testing' && selectedPrinter.filamentType !== 'Resin') {
        showMsgForDuration("This printer is not available!", 'err');
      } else if (selectedPrinter.status === 'admin' && !isAdmin) {
        showMsgForDuration("This printer is not available!", 'err');
      } else if (name.length === 0) {
        console.log("startPrintClick: err: no name");
        showMsgForDuration("No Name! Print not started.", 'err');
      } else if ((email.length === 0) && !supervisorPrint) {
        console.log("startPrintClick: err: no email");
        showMsgForDuration("No Email! Print not started.", 'err');
      } else if ((supervisor.length === 0) && !supervisorPrint) {
        console.log("startPrintClick: err: no supervisor");
        showMsgForDuration("No Supervisor! Print not started.", 'err');
      } else if ((partNames.length === 0)) {// && !supervisorPrint) {
        console.log("startPrintClick: err: no partNames");
        showMsgForDuration("No Part Names! Print not started.", 'err');
      } else if (files.length === 0) {
        console.log("startPrintClick: err: no files");
        showMsgForDuration("No Files! Print not started.", 'err');
      }
      else if ((filamentUsage === 0) || (filamentUsage === "")) {
        console.log("startPrintClick: err: no filamentUsage");
        showMsgForDuration("No Filament Usage! Print not started.", 'err');
      } else if (queue && historyList.filter(item => item.status === 'queued').some(job => {
        if (job.name.toLowerCase() === name.toLowerCase()) {
          matchingJob = job;
          return true;
        }
        return false;
      })) {
        console.log("startPrintClick: warn: duplicate name entry in queue");
        showMsgForDuration(`Warning: A job with this name is already queued!\nRemove it and continue?`, 'warn', popupTime + 5000, matchingJob);
      } else if (queue && (historyList.filter(item => item.status === 'queued').length >= 3)) {
        console.log("startPrintClick: warn: already 3 queued resin prints");
        showMsgForDuration("Resin queue is full! Print not queued.", 'err');
      } else if (((selectedPrinter.filamentType === 'PETG') || (selectedPrinter.filamentType === 'TPU')) && !personalFilament) {
        console.log("startPrintClick: warn: filament type not PLA");
        showMsgForDuration(`Warning: ${selectedPrinter.filamentType} costs $0.10 / g, even for members.\nPlease only use ${selectedPrinter.filamentType} filament on this printer!`, 'warn', popupTime + 5000);
      } else if ((selectedPrinter.filamentType === 'Resin')) {
        console.log("startPrintClick: warn: Resin filament type");
        showMsgForDuration(`Warning: Resin costs $0.12 / ml,\neven for members.`, 'warn', popupTime + 5000);
      } else if (filamentUsage > 1000) {
        console.log("startPrintClick: warn: filamentUsage > 1000g");
        showMsgForDuration("Warning: Filament Usage Exceeds 1kg.\nContinue anyway?", 'warn', popupTime + 5000);
      } else if (queue) {
        console.log("startPrintClick: warn: resin print costs $0.10 / ml");
        showMsgForDuration(`Warning: Resin prints cost $0.12 / ml,\nEven for club members.`, 'warn', popupTime + 5000);
      } else if ((selectedPrinter.filamentType === 'PLA') && !personalFilament && !memberList.map(m => m.email).includes(email) && !supervisorPrint) {
        showMsgForDuration(`Warning: Non-member detected. Pay-per-gram\nthrough TooCool is required. Continue?`, 'warn', popupTime + 5000);
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

  const buildFormJob = () => {
    return ({
      files: truncateString(files, 512),
      usage_g: Math.round(parseFloat(filamentUsage)) > 2147483647 ? 2147483647 : Math.round(parseFloat(filamentUsage)),
      timeStarted: new Date().toISOString(),
      // status: selectedPrinter?.filamentType === 'Resin' ? "queued" : "active",
      status: "active",
      name: truncateString(name, 64),
      supervisor: supervisorPrint ? truncateString(name, 64) : truncateString(supervisor, 64),
      notes: truncateString(notes, 256),
      partNames: truncateString(partNames, 256),
      email: truncateString(email, 64),
      personalFilament: personalFilament
    })
  }

  const handleWarningClick = (notification) => {
    const { id, msg, type, replaceJob, msgPrinter, msgJob } = notification
    const isResin = msgPrinter?.filamentType === 'Resin'

    setMessageQueue(prevQueue => prevQueue.filter(message => !message.msg.startsWith("Warning:")));
    if (replaceJob) {
      // delete the old queued job with the same name
      fetch(`${serverURL}/api/deleteJob/${replaceJob.jobID}`, { method: 'DELETE', }).then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      }).then(data => {
        refreshHistory();
        console.log('Deleted job with id ' + replaceJob.jobID);


        //apply changes locally
        const updatedHistoryList = historyList.filter(job => !(job.jobID === replaceJob.jobID))

        console.log('updated history list:')
        console.log(updatedHistoryList)

        setHistoryList(updatedHistoryList);

        // queue the new one if resin
        // startPrint(isResin, msgPrinter, msgJob);
        startPrint(false, msgPrinter, msgJob);

      }).catch(error => {
        console.error('Error:', error);
      });

    } else {
      // startPrint(isResin, msgPrinter, msgJob);
      startPrint(false, msgPrinter, msgJob);
    }
  }

  const startPrint = (queue = false, formPrinter = selectedPrinter, formJob = buildFormJob()) => {
    try {
      Axios.post(`${serverURL}/api/insert`, {
        printerName: formPrinter.printerName,
        ...formJob
      }).then(() => {
        if (!queue) {
          setTimeout(() => {
            //update the current job of the printer that was selected for the print
            try {
              Axios.get(`${serverURL}/api/getCurrentJob?printerName=${formPrinter.printerName}`).then((response) => {
                console.log("CurrentJob data: ");
                console.log(response.data);
                //update the printer status of the printer that was given the job
                updateTable("printer", "status", formPrinter.printerName, openToBusy(formPrinter.status), () => {
                  //update the currentJob of the printer that was used for the printJob
                  if (response.data.currentJob[0]) {
                    updateTable("printer", "currentJob", formPrinter.printerName, response.data.currentJob[0].jobID, () => {
                      const updatedPrinterList = printerList.map(printer => {
                        if (printer.printerName === formPrinter.printerName) {
                          let newPrinter = {
                            ...printer, status: openToBusy(formPrinter),
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
          if (formPrinter.filamentType !== 'Resin') { clearFields(); }
        } else {
          refreshHistory()
          clearFields();
        }
      }, 500)
    } catch (error) {
      console.error('Error submitting printJob: ', error);
    }

    showMsgForDuration(queue ? 'Print job queued!' : `Print job successfully started!`, 'msg');
  };


  const sendMail = (subject, text, target = curJob.email,) => {
    if (target.length === 0) {
      showMsgForDuration('Email not sent: No target', 'err');
    } else {
      Axios.post(`${serverURL}/api/send-email`, {
        to: target,
        subject: subject,
        text: text
      }).then(() => {
        showMsgForDuration('Email Sent Successfully', 'msg');
      }).catch((error) => {
        showMsgForDuration('Error Sending Email');
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
    setPersonalFilament(false);
    try {
      console.log("print done was clicked... setting printer status to available");
      //set status to available
      updateTable("printer", "status", selectedPrinter.printerName, busyToOpen(selectedPrinter.status), () => {

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
                return { ...printer, status: busyToOpen(selectedPrinter.status), currentJob: "" };
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
                  // Pull the count of prints with the same name and part names that failed
                  try {
                    Axios.get(`${serverURL}/api/getFailureCount?parts=${curJob.partNames}&name=${curJob.name}`).then((response) => {
                      let failureCount = response.data.count[0].cnt
                      console.log('failure count: ' + failureCount)
                      if (failureCount >= 3) {
                        sendMail("3DPC: Print Failed", text);
                      } else {
                        showMsgForDuration(`Email not sent. Failures: ${failureCount}`, 'msg');
                      }
                    });
                  } catch (error) {
                    console.error("Error fetching failure count: ", error);
                  }
                }

              } catch (e) {
                showMsgForDuration('Error Sending Email', 'err');
                console.log('Error sending email:', e);
              }
            } else {
              console.log('not sending email...')
              showMsgForDuration('No Email Sent. (Disabled)', 'msg');
            }

            selectedPrinter.status = busyToOpen(selectedPrinter.status);
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


    // if the print failed, fill in the print form data with the job's data
    if (statusArg === 'failed') {
      autofillFields(curJob);
    }
  };

  const handleMsgExit = (id) => {
    setMessageQueue(prevQueue => prevQueue.filter(message => message.id !== id));
  }

  const pullFormData = (e) => {
    try {
      let specialFilament = selectedPrinter?.filamentType !== 'PLA';

      // old macro: 'https://script.google.com/macros/s/AKfycbwdMweriskP6srd5gir1qYlA3jRoTxA2YiHcbCt7555LoqBs_BZT-OfKUJiP53kihQV/exec'

      const url = specialFilament ?
        organizerLinks.specialtyAppScriptURL :
        organizerLinks.mainAppScriptURL;

      setFormDataLoading(true);
      fetch(url).then(response => response.json()).then(data => {
        if (data !== null && data.length > 0) {
          console.log('fetched form data: ');
          console.log(data)
          showMsgForDuration('Form Data Retrieved Successfully!', 'msg');
          setFormDataLoading(false);


          let formattedData = specialFilament ?
            data.map((job) => {
              return ({
                timestamp: job[0],
                name: job[1],
                email: job[2],
                supervisorName: job[3],
                material: job[4],
                files: job[5],
                partNames: job[6],
                notes: job[11],
                discord: job[12]
              })
            }) :
            data.map((job) => {
              return ({
                timestamp: job[0],
                name: job[1],
                email: job[2],
                supervisorName: job[3],
                files: job[4],
                partNames: job[5],
                notes: job[10]
              })
            })


          setFormData(formattedData.reverse())

        } else {
          showMsgForDuration('Error Filling Form...', 'err');
        }
      });
    } catch (e) {
      showMsgForDuration('Error Filling Form...', 'err');
    }
  };

  useEffect(() => {
    // Log the messageQueue whenever it changes
    console.log("Updated messageQueue:", messageQueue);
  }, [messageQueue]);

  const showMsgForDuration = (msg, type, duration = popupTime, replaceJob = null) => {
    console.log('adding [' + msg + '] to the queue...')
    const id = Date.now(); // Unique ID for each message

    let msgJob = buildFormJob();
    const msgPrinter = selectedPrinter
    setMessageQueue(prevQueue => [...prevQueue, { id, msg, type, replaceJob, msgPrinter, msgJob }]);

    // Set a timeout to remove the message after its duration
    setTimeout(() => {
      console.log('removing [' + msg + '] from the queue...')

      setMessageQueue(prevQueue => prevQueue.filter(message => message.id !== id))
    }, duration);
  };

  const handlePrinterClick = (index) => {
    // reset personal filament and send email to default values when the printer selection changes
    setPersonalFilament(false);
    setSendEmail(true);

    setMenuOpen(false);
    if (!index) {
      selectPrinter(null);
    }
    let printer = printerList[index];
    if (printer) {
      if (selectedPrinter && (selectedPrinter.printerName === printer.printerName)) {
        selectPrinter(null);
        console.log("unselected printer: ");
        console.log(printer);
      } else {
        selectPrinter(printer);
        console.log("selected printer: ");
        console.log(printer);
      }
    }
  };

  const fillFormData = (index) => {
    // fill the form's fields with the data that was clicked
    let job = formData[index]
    if (!job) {
      showMsgForDuration('Error: Form data not found', 'err', popupTime);
    }
    setname(job.name);
    setemail(job.email);
    setsupervisor(job.supervisorName)
    setfiles(job.files);
    setnotes(job.notes);
    setpartnames(job.partNames);

    //clear the form data table
    setFormData(null);

    // make it not a supervisor print
    setSupervisorPrint(false);
  }


  const handlefiles = (e) => {
    const files = e.target.value;
    setfiles(files);
    console.log("set files to " + files);
  };

  const handlePswdChange = (e) => {
    const pswd = e.target.value;
    // console.log('changed adminPswd to ' + pswd); 
    setAdminPswd(pswd);
  }

  const handlenotes = (e) => {
    const notes = e.target.value;
    setnotes(notes);
    console.log("set notes to " + notes);
  };

  const handleUpload = async (e) => {
    let files = Array.from(e.target.files)

    // if(files.some((file)=>{
    //   return !file.name.endsWith('.stl');
    // })) {
    //   showMsgForDuration('Cannot upload files: Only .stl files allowed', 'err');
    //   return;
    // }

    // immediately clear the files state and update the placeholder
    setfiles('');
    setFilesPlaceholder('Uploading Parts to Google Drive...');

    //update the part names
    const filesList = files.map(file => {
      return file.name.substring(0, file.name.lastIndexOf('.')) || file;
    });
    const fileNames = filesList.join(', ');
    if (fileNames) {
      setpartnames(fileNames);
      console.log('set partnames to: ' + fileNames);
    }

    // create an array of promises, one for each file
    const uploadPromises = Array.from(e.target.files).map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      // console.log('formData:', formData);

      try {
        const response = await fetch(`${serverURL}/api/upload/`, {
          method: 'POST',
          body: formData
        });
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        const data = await response.json();
        // console.log('Upload response data:', data);
        return data.fileLink;
      } catch (error) {
        console.error('Error during upload:', error);
        return '';
      }
    });

    // wait for all uploads to finish before setting the files to the google drive links returned by the server
    const newFileLinks = await Promise.all(uploadPromises);

    setfiles(newFileLinks.join(', '));
    setFilesPlaceholder('Google Drive Links');
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

    if ((usage === "") || (parseFloat(usage) < 100000)) {
      setFilamentUsage(usage);
      console.log("set filament usage to " + usage);
    }

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

  const createHistoryRow = (job, isComprehensive, queue) => {
    return (
      <>
        {isAdmin && <td><button onClick={() => { handleDeleteJob(job.jobID) }} className='history-btn'>delete</button></td>}
        {
          isAdmin && <td> <button onClick={() => handleEditClick(job)} className='history-btn'>
            {editingJob.jobID !== job.jobID ? 'edit' : 'save'}
          </button></td>
        }
        {(!queue) &&
          <td>
            <button onClick={() => { autofillFields(job); showMsgForDuration('Autofill Successful', 'msg'); }} className='history-btn'>
              Autofill
            </button>
          </td>}

        <td dangerouslySetInnerHTML={{ __html: applyHighlight(formatDate(job.timeStarted, true), queue, 400) }} />


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
              {isComprehensive && <td><input type="text" className="history-edit" value={editingJob.printerName} onChange={(e) => handleJobEdit(e, "printerName")}></input></td>}
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
              <td>{job.files.split(',').map((link, index) => { return (<button style={{ cursor: 'pointer' }} onClick={() => window.location.href = getDirectDownloadLink(link.trim())}>{index + 1}</button>) })}</td>
              <td><input type="text" className="history-edit" value={editingJob.files} onChange={(e) => handleJobEdit(e, "files")}></input></td>
            </>
            :
            <>
              {!queue && <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.status, queue, 400) }} />}
              {isComprehensive && <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.printerName, queue, 400) }} />}
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.partNames, queue, 400) }} />
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.name, queue, 200) }} />
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.email, queue, 300) }} />
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.supervisorName, queue, 200) }} />
              {!queue && <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.personalFilament ? 'personal' : 'club', queue, 200) }} />}
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.usage_g.toString(), queue, 200) }} />
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.notes, queue, 600) }} />
              <td>{job.files.split(',').map((link, index) => { return (<button style={{ cursor: 'pointer' }} key={index} onClick={() => window.location.href = getDirectDownloadLink(link.trim())}>{index + 1}</button>) })}</td>
              <td dangerouslySetInnerHTML={{ __html: applyHighlight(job.files, queue, 2560) }} />
            </>
        }
      </>
    )
  }


  // Highlight the search in the job's fields by wrapping it with <b>
  const applyHighlight = (text, queue, pixelWidth = 400) => {
    const truncatedText = truncateStringWidth(text, pixelWidth);

    if (!text || !historySearch || queue) return truncatedText;

    const escapedSearch = historySearch.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedSearch, 'i');

    // Replace the search term with a bold html tag around the matched text
    return truncatedText.replace(regex, (match) => {
      return `<b style="color: rgb(40,200,40);">${match}</b>`;
    });
  };

  const printFormArgs = {
    setFormData, pullFormData, formData, truncateString, handlename, name, supervisorPrint, email, handleemail,
    handlesupervisor, partNames, handlePartNames, handleUpload, handleFilamentUsage, selectedPrinter,
    filamentUsage, files, notes, handlenotes, fillFormData, supervisor, handlefiles, formDataLoading,
    filesPlaceholder, memberList, personalFilament
  }

  return (
    <div className="App">


      {
        sidebarOpen ?
          <Sidebar printerList={printerList} handlePrinterClick={handlePrinterClick} selectedPrinter={selectedPrinter}
            handleOpenMenu={handleOpenMenu} menuOpen={menuOpen} selectPrinter={selectPrinter} width={sidebarWidth} getStatusColor={getStatusColor}
            printerSort={printerSort} handlePrinterSort={handlePrinterSort} printerRefs={printerRefs} organizerLinks={organizerLinks} />
          : <></>
      }


      <div className='main-content' style={{ marginLeft: `${sidebarOpen ? sidebarWidth : 0}px` }}>
        <div style={{ height: selectedPrinter ? '85px' : '55px' }}></div>
        {(!selectedPrinter && !menuOpen) && <div>
          <div className='null'>
            No printer selected! <br /> Choose one from the printer list on the left.
          </div>


          {(loading === 'loading') && <div>
            <img src={loadingGif} alt="loading" style={{ width: "60px", height: "60px", margin: "auto", marginBottom: "15px", marginTop: "10px" }} />
          </div>}
          {(loading === 'error') && <div>
            <h1><b>Server Connection Failed</b></h1>
            <h3 style={{ 'fontSize': '22px' }}>Please consider restarting the PC if the issue persists.</h3><br />
            <img src={xIcon} alt="error" style={{ width: "60px", height: "60px", margin: "auto", marginBottom: "15px", marginTop: "10px" }} />
          </div>}
          {loading === 'done' &&
            <div>
              {/* Print of the day stl previews*/}
              <h1 className={'menu-title ' + ((!selectedPrinter && !menuOpen) ? '' : 'hidden')}><b>🔥 Trending Prints</b></h1>
              {(potdStatus === 'done') && <TrendingPrints
                dailyPrint={dailyPrint} selectedPrinter={selectedPrinter} menuOpen={menuOpen} truncateString={truncateString}>
              </TrendingPrints>
              }


              {(potdStatus === 'loading') && <div>
                <img src={loadingGif} alt="loading" style={{ width: "60px", height: "60px", margin: "auto", marginBottom: "15px", marginTop: "10px" }} />
              </div>}
              {(potdStatus === 'error') && <div>
                <img src={xIcon} alt="error" style={{ width: "60px", height: "60px", margin: "auto", marginBottom: "15px", marginTop: "10px" }} />
              </div>}

              <h1 className={'menu-title ' + ((!selectedPrinter && !menuOpen) ? '' : 'hidden')}><b>🕜 Recently Printed Files</b></h1>
              <div className={'stl-previews ' + ((!selectedPrinter && !menuOpen) ? '' : 'hidden')}>
                <ErrorBoundary>
                  {recentFiles.map((file, index) => {
                    return (
                      <div className={'stl-preview '} key={index}><StlPreview googleDriveLink={file.file} name={file.name || ("File " + index)} getDirectDownloadLink={getDirectDownloadLink} serverURL={serverURL}></StlPreview></div>
                    )
                  })
                  }
                </ErrorBoundary>
              </div>
            </div>}
        </div>}


        <div className="printer-screen">
          {(!selectedPrinter && !menuOpen) && <div>

            {!loadingSummary && (loading === 'done') && <div>
              <h2 style={{ fontSize: "xx-large" }}>Lab Summary</h2>

              {(loading === 'done') && <div className='pie'>
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
              {loading === 'done' &&
                <div className='chart-wrapper'>
                  <LineChart argsObject={{ filledPersonalData: linePersonalData[0], filledClubData: lineClubData[0], dateWindow: lineDateWindow }} index={1} />
                  <LineChart argsObject={{ filledPersonalData: linePersonalData[1], filledClubData: lineClubData[1], dateWindow: lineDateWindow }} index={2} />
                </div>}

              {(loading === 'done') && <div className="pie">
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
                  <h2>Filament Used by Person (g)</h2>
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

              <div style={{ height: '80px' }} />

              {/* Comprehensive print history */}
              <PrintHistoryTable historyList={historyList} historySearch={historySearch} handleHistorySearch={handleHistorySearch} setHistorySearch={setHistorySearch}
                createHistoryRow={createHistoryRow} selectedPrinter={selectedPrinter} isAdmin={isAdmin} formatDate={formatDate}
                historyPeriod={historyPeriod} setHistoryPeriod={setHistoryPeriod} refreshHistory={refreshHistory}></PrintHistoryTable>

            </div>}
          </div>}

          {selectedPrinter && !menuOpen && <div>
            <div style={{ height: "35px" }}></div>
            <div className='stat-msg' style={{ backgroundColor: getStatMsgColor(), display: 'flex', flexWrap: 'nowrap', }}>
              <img src={`/images/printers/${selectedPrinter.model}.jpg`} style={{
                width: '110px', height: '110px', flex: '0 0 auto', border: '1px solid black', borderRadius: '5px', objectFit: 'contain', objectPosition: 'center', backgroundColor: '#fff'
              }} onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/images/printers/missing.jpg';
              }}></img>
              <div style={{ flex: '1 1 auto', minWidth: 0, paddingLeft: '10px' }}>
                {getStatMsg()}
                <hr style={{ borderTop: '1px solid black', width: '100%' }} />
                {(isAdmin ? <div> {"Use "}
                  <select id="filamentType" value={selectedPrinter.filamentType} onChange={handleFilamentType}>
                    <option value="PLA">PLA</option>
                    <option value="PETG">PETG</option>
                    <option value="TPU">TPU</option>
                    <option value="Resin">Resin</option>
                  </select>
                  {" on this printer."}</div>
                  :
                  "Use " + selectedPrinter.filamentType + " on this printer.")
                }
              </div>
            </div>
            <br />
            {
              (curJob && (selectedPrinter.status?.slice(-4) === 'busy')) &&
              <div>
                <div className='stat-msg info' style={{ backgroundColor: 'white', textAlign: 'left', flexDirection: 'column' }}>
                  {
                    curJob.name === curJob.supervisorName ? <>
                      <span>&nbsp;<b>Supervisor Name:</b> {curJob.name}</span>
                      <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                      <span>&nbsp;<b>Started:</b> {formatDate(curJob.timeStarted, true)}</span>
                      <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                      <span>&nbsp;<b>Filament Used:</b> {curJob.usage_g}g</span>
                      <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                      <span>&nbsp;<b>Notes:</b> {curJob.notes}</span>
                    </> : <>
                      <span>&nbsp;<b>Name:</b> {curJob.name}</span>
                      <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                      <span>&nbsp;<b>Email:</b> {curJob.email}</span>
                      <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                      <span>&nbsp;<b>Supervisor:</b> {curJob.supervisorName}</span>
                      <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                      <span>&nbsp;<b>Started:</b> {formatDate(curJob.timeStarted, true)}</span>
                      <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                      <span>&nbsp;<b>Filament Used:</b> {curJob.usage_g}g</span>
                      <hr style={{ borderTop: '1px solid lightgray', width: '100%', marginTop: '5px' }} />
                      <span>&nbsp;<b>Notes:</b> {curJob.notes}</span>
                    </>
                  }
                </div>
                <div>
                  {/* Checkbox to toggle email sending */}
                  <FormCheckbox activeCheckVal={sendEmail} handleChangeFunc={handleSendEmailChange} text={"Send Email"}></FormCheckbox>

                  {/* Checkbox to toggle stl previews */}
                  <FormCheckbox activeCheckVal={showSTLPreviews} handleChangeFunc={toggleSTLPreviews} text={"STL Previews"}></FormCheckbox>
                </div>
              </div>
            }


            {/* Printer status pages: busy, available, admin, admin-busy, broken, and testing */}

            {((selectedPrinter.status?.slice(-4) === "busy")) && <div>
              <button onClick={() => { handlePrintDoneClick("completed", null) }} style={{ backgroundColor: "rgba(100, 246, 100,0.8)" }} className='printer-btn'>
                <img className='status-icon' src={`images/check-circle.svg`}></img>Print Done</button>
              {((selectedPrinter.status === "busy") || ((selectedPrinter.status?.slice(-4) === "busy") && isAdmin)) && <>
                <button onClick={() => { handlePrintDoneClick("failed", null) }} style={{ backgroundColor: "rgba(246, 155, 97,0.8)" }} className='printer-btn'>
                  <img className='status-icon' src={`${statusIconFolder}/failed.svg`}></img>Print Failed</button>
                <button onClick={() => { cancelPrint() }} style={{ backgroundColor: 'rgb(159, 188, 254, 0.8)' }} className='printer-btn'>
                  <img className='status-icon' src={`images/cancel.svg`}></img>Cancel Print</button>
                <select className="printer-btn select" value={moveSelect} onChange={(e) => {
                  const printer = e.target.value;
                  if (!printer) return;
                  movePrint(printer);
                  setMoveSelect("");
                }}>
                  <option value="" disabled hidden>Move Print</option>
                  {printerList.map((printer) => {
                    if ((((printer.filamentType === 'Resin') && (selectedPrinter.filamentType === 'Resin')) || // both printers are resin
                      ((printer.filamentType !== 'Resin') && (selectedPrinter.filamentType !== 'Resin')))   // OR both printers aren't resin 
                      && ((printer.status == 'available') || (isAdmin && printer.status == 'admin'))) {     // AND the printer must be available
                      return <>
                        <option value={printer.printerName}>{printer.printerName}</option>
                      </>
                    }
                  })}
                </select>
              </>}
              {isAdmin && <>
                <div>
                  <button onClick={() => { printerChangeWhileBusy("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={`${statusIconFolder}/broken.svg`}></img>Printer Broke</button>
                  <button onClick={() => { printerChangeWhileBusy("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={`${statusIconFolder}/testing.svg`}></img>Testing Printer</button>
                  {selectedPrinter.status === 'busy' && <button onClick={() => { printerChangeWhileBusy("admin") }} style={{ backgroundColor: "rgba(100, 180, 100, 0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={`${statusIconFolder}/admin.svg`}></img>Admin Printer</button>}
                </div>
              </>}
              <br />



              {/* If the printer is a resin printer, then also include the option to queue up a new print */}
              {
                // selectedPrinter.filamentType === 'Resin' && <>
                //   {(((selectedPrinter.status?.slice(-4) === "busy"))) && <>
                //     <StlPreviewSection
                //       showSTLPreviews={showSTLPreviews}
                //       curJob={curJob}
                //       getDirectDownloadLink={getDirectDownloadLink}
                //       truncateString={truncateString}
                //       serverURL={serverURL}
                //     />
                //   </>}
                //   <br /><br />
                //   <PrintForm printFormArgs={printFormArgs}></PrintForm>
                //   <br />

                //   {/* Checkbox to toggle supervisor print */}
                //   <FormCheckbox activeCheckVal={supervisorPrint} handleChangeFunc={handleSupervisorPrintChange} text={"Supervisor Print"}></FormCheckbox>

                //   {/* Checkbox to toggle personal filament */}

                //   {(selectedPrinter.filamentType !== 'Resin') &&
                //     <FormCheckbox activeCheckVal={personalFilament} handleChangeFunc={handlePersonalFilamentChange} text={"Personal Filament"}></FormCheckbox>
                //   }

                //   <br />
                //   {/* <button onClick={() => { handleStartPrintClick(selectedPrinter.filamentType === 'Resin') }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>
                //     <img className='status-icon' src={selectedPrinter.filamentType !== 'Resin' ? `${statusIconFolder}/start.svg` : `${statusIconFolder}/queue.svg`}></img>{selectedPrinter.filamentType === 'Resin' ? 'Queue Print' : 'Start Print'}</button> */}
                //   <button onClick={() => { handleStartPrintClick(false) }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>
                //     <img className='status-icon' src={`${statusIconFolder}/start.svg`}></img>{'Start Print'}</button>
                //   <button onClick={() => { clearFields() }} style={{ backgroundColor: 'rgb(159, 188, 254, 0.8)' }} className='printer-btn'>
                //     <img className='status-icon' src={`${statusIconFolder}/clear.svg`}></img>Clear Form</button>
                // </>
              }


            </div>}

            {(((selectedPrinter.status?.slice(-4) === "busy")) && selectedPrinter.filamentType !== 'Resin') && <>
              <StlPreviewSection
                showSTLPreviews={showSTLPreviews}
                curJob={curJob}
                getDirectDownloadLink={getDirectDownloadLink}
                truncateString={truncateString}
                serverURL={serverURL}
              />
            </>}



            {selectedPrinter && (selectedPrinter.status === "available") && <div>
              <div>
                <PrintForm printFormArgs={printFormArgs}></PrintForm>
                <br />

                {/* Checkbox to toggle supervisor print */}
                <FormCheckbox activeCheckVal={supervisorPrint} handleChangeFunc={handleSupervisorPrintChange} text={"Supervisor Print"}></FormCheckbox>

                {/* Checkbox to toggle stl previews */}
                <FormCheckbox activeCheckVal={showSTLPreviews} handleChangeFunc={toggleSTLPreviews} text={"STL Previews"}></FormCheckbox>

                {/* Checkbox to toggle personal filament */}
                {(selectedPrinter.filamentType !== 'Resin') &&
                  <FormCheckbox activeCheckVal={personalFilament} handleChangeFunc={handlePersonalFilamentChange} text={"Personal Filament"}></FormCheckbox>
                }

                <br />
                {/* <button onClick={() => { handleStartPrintClick(selectedPrinter.filamentType === 'Resin') }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={selectedPrinter.filamentType !== 'Resin' ? `${statusIconFolder}/start.svg` : `${statusIconFolder}/queue.svg`}></img>{selectedPrinter.filamentType === 'Resin' ? 'Queue Print' : 'Start Print'}</button> */}
                <button onClick={() => { handleStartPrintClick(false) }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>
                  <img className='status-icon' src={`${statusIconFolder}/start.svg`}></img>{'Start Print'}</button>
                <button onClick={() => { clearFields() }} style={{ backgroundColor: 'rgb(159, 188, 254, 0.8)' }} className='printer-btn'>
                  <img className='status-icon' src={`${statusIconFolder}/clear.svg`}></img>Clear Form</button>
                {isAdmin && <div style={{ display: 'block' }}>
                  <button onClick={() => { handlePrinterStatusChange("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={`${statusIconFolder}/broken.svg`}></img>Printer Broke</button>
                  <button onClick={() => { handlePrinterStatusChange("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={`${statusIconFolder}/testing.svg`}></img>Testing Printer</button>
                  <button onClick={() => { handlePrinterStatusChange("admin") }} style={{ backgroundColor: "rgba(100, 180, 100, 0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={`${statusIconFolder}/admin.svg`}></img>Admin Printer</button>
                </div>}
                <br />

                <StlPreviewSection
                  showSTLPreviews={showSTLPreviews}
                  curJob={{ 'files': files, 'partNames': partNames }}
                  getDirectDownloadLink={getDirectDownloadLink}
                  truncateString={truncateString}
                  serverURL={serverURL}
                />
              </div>
            </div>}

            {selectedPrinter && (selectedPrinter.status === "admin" || selectedPrinter.status === "testing") && isAdmin && <div>
              <PrintForm printFormArgs={printFormArgs}></PrintForm>
              <br />

              {/* Checkbox to toggle supervisor print */}
              <FormCheckbox activeCheckVal={supervisorPrint} handleChangeFunc={handleSupervisorPrintChange} text={"Supervisor Print"}></FormCheckbox>

              <FormCheckbox activeCheckVal={showSTLPreviews} handleChangeFunc={toggleSTLPreviews} text={"STL Previews"}></FormCheckbox>

              {/* Checkbox to toggle personal filament */}
              {(selectedPrinter.filamentType !== 'Resin') &&
                <FormCheckbox activeCheckVal={personalFilament} handleChangeFunc={handlePersonalFilamentChange} text={"Personal Filament"}></FormCheckbox>
              }

              <br />
              {/* <button onClick={() => { handleStartPrintClick(selectedPrinter.filamentType === 'Resin') }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={selectedPrinter.filamentType !== 'Resin' ? `${statusIconFolder}/start.svg` : `${statusIconFolder}/queue.svg`}></img>{selectedPrinter.filamentType === 'Resin' ? 'Queue Print' : 'Start Print'}</button> */}
              <button onClick={() => { handleStartPrintClick(false) }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>
                <img className='status-icon' src={`${statusIconFolder}/start.svg`}></img>{'Start Print'}</button>
              <button onClick={() => { clearFields() }} style={{ backgroundColor: 'rgb(159, 188, 254, 0.8)' }} className='printer-btn'>
                <img className='status-icon' src={`${statusIconFolder}/clear.svg`}></img>Clear Form</button>

              {isAdmin && <div style={{ display: 'block' }}>
                <button onClick={() => { handlePrinterStatusChange("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>
                  <img className='status-icon' src={`${statusIconFolder}/broken.svg`}></img>Printer Broke</button>

                {(selectedPrinter.status === "admin") && <>
                  <button onClick={() => { handlePrinterStatusChange("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={`${statusIconFolder}/testing.svg`}></img>Testing Printer</button>
                </>
                }
                {(selectedPrinter.status === "testing") && <>
                  <button onClick={() => { handlePrinterStatusChange("admin") }} style={{ backgroundColor: "rgba(100, 180, 100, 0.8)" }} className='printer-btn'>
                    <img className='status-icon' src={`${statusIconFolder}/admin.svg`}></img>Admin Printer</button>
                </>
                }
                <button onClick={() => { handlePrinterStatusChange("available") }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>
                  <img className='status-icon' src={`${statusIconFolder}/available.svg`}></img>Printer Available</button>
              </div>}

              <br />

              <StlPreviewSection
                showSTLPreviews={showSTLPreviews}
                curJob={{ 'files': files, 'partNames': partNames }}
                getDirectDownloadLink={getDirectDownloadLink}
                truncateString={truncateString}
                serverURL={serverURL}
              />
            </div>}

            {selectedPrinter && (selectedPrinter.status === "broken") && isAdmin && <div>
              <button onClick={() => { handlePrinterStatusChange("available") }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>
                <img className='status-icon' src={`${statusIconFolder}/available.svg`}></img>Printer Available</button>
              <button onClick={() => { handlePrinterStatusChange("testing") }} style={{ backgroundColor: "rgba(255, 255, 255,0.8)" }} className='printer-btn'>
                <img className='status-icon' src={`${statusIconFolder}/testing.svg`}></img>Testing Printer</button>
              <button onClick={() => { handlePrinterStatusChange("admin") }} style={{ backgroundColor: "rgba(100, 180, 100, 0.8)" }} className='printer-btn'>
                <img className='status-icon' src={`${statusIconFolder}/admin.svg`}></img>Admin Printer</button>
            </div>}

            {/* {selectedPrinter && (selectedPrinter.status === "testing") && isAdmin && <div>
              <button onClick={() => { handlePrinterStatusChange("available") }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>
                <img className='status-icon' src={`${statusIconFolder}/available.svg`}></img>Printer Available</button>
              <button onClick={() => { handlePrinterStatusChange("broken") }} style={{ backgroundColor: "rgba(246, 97, 97,0.8)" }} className='printer-btn'>
                <img className='status-icon' src={`${statusIconFolder}/broken.svg`}></img>Printer Broke</button>
              <button onClick={() => { handlePrinterStatusChange("admin") }} style={{ backgroundColor: "rgba(100, 180, 100, 0.8)" }} className='printer-btn'>
                <img className='status-icon' src={`${statusIconFolder}/admin.svg`}></img>Admin Printer</button>
            </div>} */}

            {/* End printer status pages */}

            {selectedPrinter && isAdmin && (printerNotes === null) && <div>
              <div style={{ height: '20px' }}></div>

              <div className='notes-msg'>
                <strong>-- Printer Status Notes --</strong><br />
                {
                  selectedPrinter.notes ?
                    <div className='printer-notes-wrapper'>
                      {selectedPrinter.notes}
                    </div> :
                    <>
                      {"This printer has no notes."}
                    </>
                }

              </div>
              <button onClick={() => { handleEditPrinterNotesClick() }} style={{ marginTop: '10px', cursor: 'pointer', padding: '2px 5px' }}>Edit Notes</button>
            </div>}

            {selectedPrinter && isAdmin && printerNotes !== null && <div>
              <div className='notes-msg'>
                <strong>-- Printer Status Notes --</strong><br />
                <textarea id="printerNotesInput" value={printerNotes} type="text" onChange={handlePrinterNotes}></textarea>
              </div>
              <button onClick={() => { updatePrinterNotes() }} style={{ marginTop: '10px', cursor: 'pointer', padding: '2px 5px' }}>Save Notes</button>
            </div>}

            {/* Resin queue table */}
            {/* {
              selectedPrinter.filamentType === 'Resin' && <div>
                <div style={{ height: "50px" }}></div>

                <div className="print-history" style={{ marginTop: '20px' }}>Resin Printing Queue [{historyList.filter(item => item.status === 'queued').length}/3]</div>

                <div className='wrapper-wrapper'>
                  <table className='history-wrapper'>
                    <thead>
                      <tr className='queue-top'>
                        {isAdmin && <th>Delete</th>}
                        {isAdmin && <th>Edit</th>}

                        <th>Time Queued</th>
                        <th>Parts</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Supervisor</th>
                        <th>Usage (ml)</th>
                        <th>Notes</th>
                        <th>Downloads</th>
                        <th>Files</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyList.map((job) => {
                        if (!(job.status === 'queued')) {
                          return null;
                        }

                        return <tr className={`${job.status} history-row`} key={job.jobID}>
                          {createHistoryRow(job, false, true)}
                        </tr>
                      })}
                    </tbody>
                  </table>
                </div>
                {((historyList.filter(item => item.status === 'queued').length > 0) && ((isAdmin && (selectedPrinter.status === 'admin')) || (selectedPrinter.status === 'available'))) &&
                  <button onClick={() => { releaseFromQueue() }} style={{ backgroundColor: "rgba(30, 203, 96,0.8)" }} className='printer-btn'>{'Release From Queue'}</button>}

              </div>
            } */}

            <div style={{ height: "100px" }}></div>

            {/* print history table */}
            <PrintHistoryTable historyList={historyList} historySearch={historySearch} handleHistorySearch={handleHistorySearch} setHistorySearch={setHistorySearch}
              createHistoryRow={createHistoryRow} selectedPrinter={selectedPrinter} isAdmin={isAdmin} formatDate={formatDate}
              historyPeriod={historyPeriod} setHistoryPeriod={setHistoryPeriod} refreshHistory={refreshHistory}></PrintHistoryTable>


            <div className='printer-header-wrapper' style={{ width: `calc((100% - ${sidebarOpen ? sidebarWidth : 0}px))` }}>
              <div className='printer-header' style={{
                display: 'inline-block',
                whiteSpace: 'nowrap',
                backgroundColor: `${getStatusColor(selectedPrinter.status)}`,
                margin: 'auto',
                paddingLeft: '10px',
                paddingRight: '20px',
              }}>
                <img className='status-icon' style={{ height: '25px', width: '25px', paddingRight: '8px' }} src={mapStatusToIcon(selectedPrinter.status)}></img>
                {selectedPrinter.printerName} - {selectedPrinter.model}
              </div>
            </div>
          </div>}
        </div>

        {menuOpen ? (
          <div className='menuBG visible' style={{ left: `${sidebarOpen ? sidebarWidth + 2 : 0}px`, width: `calc(100vw - ${sidebarOpen ? sidebarWidth : 0}px)` }}>
            {
              <Settings adminPswd={adminPswd} handlePswdChange={handlePswdChange}
                isAdmin={isAdmin} checkPswd={checkPswd} feedbackSubject={feedbackSubject} feedbackText={feedbackText}
                handleFeedbackSubjectChange={handleFeedbackSubjectChange} handleFeedbackTextChange={handleFeedbackTextChange}
                handleFeedbackClick={handleFeedbackClick} handleIsAdminChange={handleIsAdminChange}
                serverURL={serverURL} setServerURL={setServerURL} menuOpen={menuOpen} truncateStringWidth={truncateStringWidth}
                memberList={memberList} setMemberList={setMemberList} formatDate={formatDate} truncateString={truncateString}
                showMsgForDuration={showMsgForDuration} setOrganizerLinks={setOrganizerLinks}/>
            }
          </div>
        ) :
          (
            <div className='menuBG hidden' style={{ left: `${sidebarOpen ? sidebarWidth + 2 : 0}px`, width: `calc(100vw - ${sidebarOpen ? sidebarWidth : 0}px)` }}>
              <Settings adminPswd={adminPswd} handlePswdChange={handlePswdChange}
                isAdmin={isAdmin} checkPswd={checkPswd} feedbackSubject={feedbackSubject} feedbackText={feedbackText}
                handleFeedbackSubjectChange={handleFeedbackSubjectChange} handleFeedbackTextChange={handleFeedbackTextChange}
                handleFeedbackClick={handleFeedbackClick} handleIsAdminChange={handleIsAdminChange}
                serverURL={serverURL} setServerURL={setServerURL} menuOpen={menuOpen} truncateStringWidth={truncateStringWidth}
                memberList={memberList} setMemberList={setMemberList} formatDate={formatDate} truncateString={truncateString}
                showMsgForDuration={showMsgForDuration} />
            </div>
          )}

        <div className="header" style={{ left: `${sidebarOpen ? sidebarWidth + 3 : 0}px`, width: `calc(100vw - ${sidebarOpen ? sidebarWidth : 0}px)`, backgroundColor: `${isAdmin ? 'rgba(2550, 2550, 255, 0.6)' : 'rgba(180, 180, 180, 0.6)'}` }}>
          <h1 style={{ color: 'rgb(0,0,0)' }}>{isAdmin ? '3DPC - Print Manager - Admin' : '3DPC - Print Manager'}</h1>
        </div>
        {
          messageQueue.map((notification, index) => {
            const { id, msg, type, replaceJob, msgPrinter, msgJob } = notification
            return (
              <div style={{ top: `${10 + (index * 60) + (getWarningsBeforeIndex(index) * 85)}px`, whiteSpace: 'pre-line', zIndex: 11 }} key={id} className={`${type}-msg`}>{msg}<img src={exitIcon} className="msg-exit" onClick={() => handleMsgExit(id)}></img>
                {(type === 'warn') && <div className="warning-content">
                  <div onClick={() => { handleWarningClick(notification) }} style={{ backgroundColor: "#afc6fa" }} className='printer-btn'>Continue</div>
                </div>}
              </div>
            )
          })
        }
      </div>


      <div id="resizer" onMouseDown={handleMouseDown} style={{ marginLeft: `${sidebarOpen ? sidebarWidth - 1 : 0}px` }}></div>
      <div id="resizer-btn" onMouseDown={() => { handleCollapseSidebar() }} style={{ marginLeft: `${sidebarOpen ? sidebarWidth - 4 : 0}px` }}><b style={{ userSelect: 'none' }}>&lt;<br />&gt;</b></div>

    </div>
  );

}


function StlPreviewSection({ showSTLPreviews, curJob, getDirectDownloadLink, truncateString, serverURL }) {
  return (
    <>
      {showSTLPreviews ? (
        <ErrorBoundary>
          <div className="stl-previews">
            {curJob && curJob.files.split(',').map((link, index) => {
              let trimmedLink = link.trim();

              if (trimmedLink.startsWith('https://')) {
                let partname = String(curJob.partNames)?.split(',')[index]

                return (
                  <div className="stl-preview" key={index}>
                    <StlPreview googleDriveLink={link} name={partname ? truncateString(partname.trim(), 32) : 'File ' + index} getDirectDownloadLink={getDirectDownloadLink} serverURL={serverURL} />
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
        </ErrorBoundary>
      ) : (
        <>
          {curJob && curJob.files.split(',').map((link, index) => {
            if (link.trim().startsWith('https://')) {
              let partname = curJob.partNames?.split(',')[index]

              return (
                <button className="printer-btn" key={index} onClick={() => window.location.href = getDirectDownloadLink(link.trim())}>
                  <img className='status-icon ' src={`images/download.svg`}></img> {partname ? truncateString(partname.trim(), 24) : 'File ' + index}
                </button>
              );
            } else {
              return null;
            }
          })}
        </>
      )}
    </>
  );
}





function PrintHistoryTable({ historyList, historySearch, handleHistorySearch, setHistorySearch, createHistoryRow, selectedPrinter, isAdmin, formatDate, historyPeriod, setHistoryPeriod, refreshHistory }) {

  function leftArrowClick(historyPeriod) {
    if (historyPeriod.seasonEnc === 0) {
      setHistoryPeriod(old => ({ ...old, year: old.year - 1, seasonEnc: 2 }))
    } else {
      setHistoryPeriod(old => ({ ...old, year: old.year, seasonEnc: old.seasonEnc - 1 }))
    }
  }
  function rightArrowClick(historyPeriod) {

    if (historyPeriod.seasonEnc === 2) {
      setHistoryPeriod(old => ({ ...old, year: old.year + 1, seasonEnc: 0 }))
    } else {
      setHistoryPeriod(old => ({ ...old, year: old.year, seasonEnc: old.seasonEnc + 1 }))
    }
  }

  let isComprehensive = !selectedPrinter;
  let seasonText = historyPeriod.seasonEnc === 0 ? 'Spring' : historyPeriod.seasonEnc === 1 ? 'Summer' : 'Fall';
  let title = seasonText + ' ' + historyPeriod.year + ' ';
  title += selectedPrinter ? 'History' : 'Full History';
  return (<>
    <div className="print-history">
      <div style={{ margin: '0px', padding: '0px', justifyContent: 'center', alignItems: 'center', display: 'flex', userSelect: 'none' }}>
        <div className='arrow-btn left' onClick={() => leftArrowClick(historyPeriod)}>&lt;</div>
        <div style={{ width: "75%", maxWidth: '500px' }}> {title} [{historyList.length - historyList.filter(item => item.status === 'queued').length}] </div>
        <div className='arrow-btn right' onClick={() => rightArrowClick(historyPeriod)}>&gt;</div>
      </div>
      <div className="search-bar">
        <img src={searchIcon} style={{ width: "25px", height: "20px" }}></img>
        Search:&nbsp;
        <input type="text" value={historySearch} onChange={handleHistorySearch}></input>
        <button style={{ cursor: 'pointer' }} onClick={() => setHistorySearch('')}>Clear</button>
      </div>
    </div>
    <div style={{ height: 'calc(85vh - 90px)', overflow: 'hidden' }}>
      <div className='wrapper-wrapper'>
        <table className='history-wrapper'>
          <thead>
            <tr>
              {isAdmin && <th>Delete</th>}
              {isAdmin && <th>Edit</th>}
              {<th>Autofill</th>}
              <th>Time Started</th>
              <th>Status</th>
              {isComprehensive && <th>Printer</th>}
              <th>Parts</th>
              <th>Name</th>
              <th>Email</th>
              <th>Supervisor</th>
              <th>Filament</th>
              <th>Used {selectedPrinter?.filamentType === 'Resin' ? '(ml)' : '(g)'}</th>
              <th>Notes</th>
              <th>Downloads</th>
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
                }
                return (typeof value === 'string' && value.toLowerCase().includes(historySearch.toLowerCase()))
              }
              );
              if (!containsSearch || job.status === 'queued') {
                return null;
              }

              return <tr className={`${job.status} history-row`} key={job.jobID}>
                {createHistoryRow(job, isComprehensive, false)}
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
    <div style={{ height: '3vh' }} />
  </>)
}

function FormCheckbox({ activeCheckVal, handleChangeFunc, text }) {
  return (
    <>
      <label
        className={`checkbox-container ${activeCheckVal ? 'active' : ''}`}>
        <input type="checkbox" checked={activeCheckVal} onChange={handleChangeFunc} />
        <span className="custom-checkbox"></span>
        <span style={{ userSelect: 'none' }} className="checkbox-label">{text}</span>
      </label>
    </>
  );
}


export default App;
