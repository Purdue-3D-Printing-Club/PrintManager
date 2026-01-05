import React, { useEffect, useRef, useState } from 'react';
import Axios from 'axios';
import { Pie } from 'react-chartjs-2';

import LineChart from './LineChart';
import ErrorBoundary from './ErrorBoundary';

import loadingGif from '/images/loading.gif'
import xIcon from '/images/x.png';
import noSignalIcon from '/images/no_signal.svg';
import TrendingPrints from './TrendingPrints';
import StlPreview from './StlPreview';

import './HomeScreen.css';

function HomeScreen({ homeScreenArgs }) {
    let { sidebarOpen, sidebarWidth, loading, setLoading,
        selectedPrinter, menuOpen, truncateString, generalSettings, getDirectDownloadLink,
        serverURL, PrintHistoryTable, printHistoryArgs, printerList, formatDate
    } = homeScreenArgs;

    // Page control

    const [pagesMounted, setPagesMounted] = useState([true, false]); // controls DOM mounting
    const [currentPage, setCurrentPage] = useState(0); // controls which page is visible
    const [chartsOpen, setChartsOpen] = useState([false, false, false, false, false, false])

    // Summary data
    const [frequencies, setFrequencies] = useState([]);
    const [supervisorData, setSupervisorData] = useState([]);
    const [nameFilamentData, setNameFilamentData] = useState([]);
    const [filamentSum, setFilamentSum] = useState([]);


    const [recentFiles, setRecentFiles] = useState([]);
    const [dailyPrint, setDailyPrint] = useState([]);
    const [potdStatus, setPotdStatus] = useState('loading')
    const hasFetchedDailyPrint = useRef(false);
    const [printerNames, setPrinterNames] = useState([]);

    const [linePersonalData, setLinePersonalData] = useState([]);
    const [lineClubData, setLineClubData] = useState([]);
    const [linePpgData, setLinePpgData] = useState([]);
    const [lineDateWindow, setLineDateWindow] = useState([]);


    useEffect(() => {
        if (selectedPrinter || (printerList.length === 0)) {
            return;
        }

        // fetch recent files
        try {
            Axios.get(`${serverURL}/api/getRecentFiles`).then((response) => {
                let recentFilesTemp = response.data.recentFiles;
                recentFilesTemp.files = recentFilesTemp.files.split(/[,;]/).map(file => file.trim())
                recentFilesTemp.partNames = recentFilesTemp.partNames.split(/[,;]/).map(name => name.trim())

                if (generalSettings?.debugMode) console.log('recentFilesTemp:', recentFilesTemp)
                const newRecentFiles = recentFilesTemp.files.map((file, index) => ({
                    file: file,
                    name: recentFilesTemp.partNames[index] || ""
                }));

                if (generalSettings?.debugMode) console.log('setting new recent files: ', newRecentFiles)
                setRecentFiles(newRecentFiles)
            });
        } catch (error) {
            console.error("Error fetching recent files data: ", error);
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
                    //   if (generalSettings?.debugMode)  console.log('trending print file name: ', fileName);
                    //   newDailyPrint.push({
                    //     "name": fileName,
                    //     "file": dailyPrintTemp[fileno]
                    //   });
                    // }

                    if (generalSettings?.debugMode) console.log('setting trending print: ', dailyPrintTemp);
                    setPotdStatus('done')
                    // setDailyPrint({ 'parts': dailyPrintTemp, 'pageLink': response.data.pageLink, 'pageName': response.data.pageName });
                    setDailyPrint(dailyPrintTemp);
                }).catch(e => {
                    setPotdStatus('error')
                });
            } catch (error) {
                console.error("Error fetching print of the day: ", error);
                setPotdStatus('error')
            }
        }


        const generateDateRange = (startDate, endDate) => {
            const dateArray = [];
            let currentDate = new Date(startDate);

            while (currentDate <= new Date(endDate)) {
                // const yyyy = currentDate.getFullYear();
                // const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
                // const dd = String(currentDate.getDate()).padStart(2, '0');

                // dateArray.push(`${yyyy}-${mm}-${dd}`);

                dateArray.push(formatDate(currentDate.toISOString(), false))
                currentDate.setDate(currentDate.getDate() + 1);
            }

            return dateArray;
        };

        //if (generalSettings?.debugMode)  console.log(`### loading line chart ${index}...`)
        try {
            Axios.get(`${serverURL}/api/getfreq`).then((response) => {
                if (generalSettings?.debugMode) console.log("frequencies: ", response.data);
                const sortedData = response.data.res;

                setPrinterNames(sortedData.map(printer => printer.printerName));
                setFrequencies(sortedData.map(printer => printer.cnt));
                setFilamentSum(sortedData.map(printer => printer.sum));

                try {
                    Axios.get(`${serverURL}/api/getsupervisordata`).then((response) => {
                        if (generalSettings?.debugMode) console.log('supervisor data: ', sortedData)
                        setSupervisorData(response.data.res);
                        Axios.get(`${serverURL}/api/getfilamentdata`).then((response) => {
                            if (generalSettings?.debugMode) console.log('filament name data: ', response.data.res)
                            setNameFilamentData(response.data.res);
                            if (generalSettings?.debugMode) console.log()

                            Axios.get(`${serverURL}/api/getdailyprints`).then((response2) => {
                                if (generalSettings?.debugMode) console.log("daily data: ", response2.data);

                                if (response2.data) {
                                    const dailyData = response2.data.res;
                                    const personal = dailyData.filter(item => item.paid == 'personal')
                                    const club = dailyData.filter(item => item.paid == 'club')
                                    const ppg = dailyData.filter(item => item.paid == 'per-gram')


                                    const startDate = dailyData.length > 0 ? dailyData[0].date : null;
                                    const endDate = dailyData.length > 0 ? formatDate(new Date().toISOString(), false) : null; //dailyData[dailyData.length - 1].date

                                    if (startDate && endDate) {
                                        const allDates = generateDateRange(startDate, endDate);

                                        // store the data needed for line chart 1
                                        const personalDataMap1 = new Map(personal.map(day => [formatDate(day.date, false), day.cnt]));
                                        const clubDataMap1 = new Map(club.map(day => [formatDate(day.date, false), day.cnt]));
                                        const ppgDataMap1 = new Map(ppg.map(day => [formatDate(day.date, false), day.cnt]));


                                        // Fill in missing dates with 0
                                        const filledPersonalCnt = allDates.map(date => personalDataMap1.get(date) || 0);
                                        const filledClubCnt = allDates.map(date => clubDataMap1.get(date) || 0);
                                        const filledPpgCnt = allDates.map(date => ppgDataMap1.get(date) || 0);

                                        //createLineChart(lineRef, filledPersonalCnt, filledClubCnt, allDates)


                                        // store the data needed for line chart 2
                                        const personalDataMap2 = new Map(personal.map(day => [formatDate(day.date, false), day.sum]));
                                        const clubDataMap2 = new Map(club.map(day => [formatDate(day.date, false), day.sum]));
                                        const ppgDataMap2 = new Map(ppg.map(day => [formatDate(day.date, false), day.sum]));

                                        // Fill in missing dates with 0
                                        const filledPersonalSum = allDates.map(date => personalDataMap2.get(date) || 0);
                                        const filledClubSum = allDates.map(date => clubDataMap2.get(date) || 0);
                                        const filledPpgSum = allDates.map(date => ppgDataMap2.get(date) || 0);

                                        //createLineChart(lineRef, filledPersonalSum, filledClubSum, allDates)


                                        // set the useState variables to the processed data
                                        setLinePersonalData([filledPersonalCnt, filledPersonalSum]);
                                        setLineClubData([filledClubCnt, filledClubSum]);
                                        setLinePpgData([filledPpgCnt, filledPpgSum]);

                                        setLineDateWindow(allDates);
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
            });

        } catch (error) {
            console.error("Error fetching printer data: ", error);
            setLoading('error');
        }
    }, [selectedPrinter, serverURL, menuOpen, printerList])


    const toggleChart = (chartIndex) => {
        let newChartsOpen = [...chartsOpen];
        newChartsOpen[chartIndex] = !newChartsOpen[chartIndex];
        setChartsOpen(newChartsOpen);
        if (generalSettings?.debugMode) console.log(`toggled chartsOpen[${chartIndex}] to ${newChartsOpen[chartIndex]}.`);
    }

    const wrapperRef = useRef(null);

    const handlePageChange = (nextPage) => {
        // Mount next page so it exists during slide
        const newPages = [...pagesMounted];
        newPages[nextPage] = true;
        setPagesMounted(newPages);

        // Trigger slide
        setCurrentPage(nextPage);

        // Wait for CSS transition to finish and dismount old page
        const onTransitionEnd = () => {
            const newPagesAfter = [false, false];
            newPagesAfter[nextPage] = true;
            setPagesMounted(newPagesAfter);

            wrapperRef.current.removeEventListener('transitionend', onTransitionEnd);
        };

        wrapperRef.current.addEventListener('transitionend', onTransitionEnd);
    };








    return (<>
        {(!selectedPrinter && !menuOpen) && <div ref={wrapperRef} className={`page-wrapper ${(currentPage == 1) ? 'slide-left' : ''}`}>

            {/* Home page 1 */}
            {pagesMounted[0] ?
                <div className={`page`} style={{ width: `calc((100vw - ${sidebarOpen ? sidebarWidth : 0}px))` }}>
                    {(loading === 'loading') && <div>
                        <img src={loadingGif} alt="loading" style={{ width: "60px", height: "60px", margin: "auto", marginBottom: "15px", marginTop: "10px" }} />
                    </div>}
                    {(loading === 'error') && <div>
                        <h1><b>Server Connection Failed</b></h1>
                        <h3 style={{ 'fontSize': '22px' }}>Please try restarting the PC if the issue persists.</h3><br />
                        <img src={noSignalIcon} alt="error" style={{
                            width: "60px", height: "60px", margin: "auto", marginBottom: "15px", marginTop: "10px"
                        }} />
                    </div>}
                    {loading === 'done' &&
                        <div >
                            <div className="title-box" onClick={() => { handlePageChange(1) }}>
                                <div className="title-container">
                                    <h2 className="title-text">Lab Summary Visualizations</h2>
                                    <div className="slide-arrow right"></div>

                                </div>
                            </div>

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
                                        if (generalSettings.showFilePreviews) {
                                            return (
                                                <div className={'stl-preview '} key={index}><StlPreview googleDriveLink={file.file} name={file.name || ("File " + index)} getDirectDownloadLink={getDirectDownloadLink} serverURL={serverURL}></StlPreview></div>
                                            )
                                        } else {
                                            return (
                                                <button className="printer-btn" key={index} onClick={() => window.location.href = getDirectDownloadLink(file.file.trim())}>
                                                    <img className='status-icon ' src={`images/download.svg`}></img> {file.name ? truncateString(file.name.trim(), 24) : 'File ' + index}
                                                </button>
                                            )
                                        }
                                    })
                                    }
                                </ErrorBoundary>
                            </div>

                            <div style={{ height: '20px' }}></div>
                            {/* Comprehensive print history */}
                            <PrintHistoryTable printHistoryArgs={printHistoryArgs}></PrintHistoryTable>

                        </div>}
                </div> : <div style={{ width: `calc((100vw - ${sidebarOpen ? sidebarWidth : 0}px))` }}>
                </div>}

            {/* Home page 2 */}
            {pagesMounted[1] &&
                <div className={`page`} style={{ marginLeft: `${sidebarOpen ? sidebarWidth : 0}px`, width: `calc((100vw - ${sidebarOpen ? sidebarWidth : 0}px))` }}>


                    <div className="title-box" onClick={() => { handlePageChange(0) }}>
                        <div className="title-container">
                            <div className="slide-arrow left"></div>
                            <h2 className="title-text">Back to Home</h2>
                        </div>
                    </div>



                    {/* Charts below */}
                    {loading === 'done' && <div>

                        <CollapsibleChart index={0} title="Number of Jobs Per Printer"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} type={'pie'}>
                            <Pie
                                data={{
                                    labels: printerNames.map(name => truncateString(name, 15)),
                                    datasets: [
                                        { data: frequencies },
                                        { data: [] }
                                    ],
                                }}
                                options={{
                                    plugins: {
                                        legend: {
                                            position: 'right',
                                        },
                                    },
                                }}
                            />
                        </CollapsibleChart>

                        <CollapsibleChart index={1} title="Filament Used Per Printer (g)"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} type={'pie'}>
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
                        </CollapsibleChart>

                        <CollapsibleChart index={2} title="Number of Prints By Day"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} type={'line'}>
                            <LineChart argsObject={{
                                filledPersonalData: linePersonalData[0], filledClubData: lineClubData[0],
                                filledPpgData: linePpgData[0], dateWindow: lineDateWindow
                            }} index={1} />

                        </CollapsibleChart>

                        <CollapsibleChart index={3} title="Filament Used By Day (g)"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} type={'line'}>
                            <LineChart argsObject={{
                                filledPersonalData: linePersonalData[1], filledClubData: lineClubData[1],
                                filledPpgData: linePpgData[1], dateWindow: lineDateWindow
                            }} index={2} />
                        </CollapsibleChart>

                        <CollapsibleChart index={4} title="Number of Prints by Supervisor"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} type={'pie'}>
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
                        </CollapsibleChart>

                        <CollapsibleChart index={5} title="Filament Used per Person (g)"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} type={'pie'}>
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
                        </CollapsibleChart>

                    </div>
                    }


                    {/*                     
                    
                    {loading === 'done' &&
                        <div className='chart-wrapper'>
                            <LineChart argsObject={{
                                filledPersonalData: linePersonalData[0], filledClubData: lineClubData[0],
                                filledPpgData: linePpgData[0], dateWindow: lineDateWindow
                            }} index={1} />
                            <LineChart argsObject={{
                                filledPersonalData: linePersonalData[1], filledClubData: lineClubData[1],
                                filledPpgData: linePpgData[1], dateWindow: lineDateWindow
                            }} index={2} />
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
                    
                    */}




                    <div className="title-box" style={{ marginTop: '10px', marginBottom: '20px' }} onClick={() => { handlePageChange(0) }}>
                        <div className="title-container">
                            <div className="slide-arrow left"></div>
                            <h2 className="title-text">Back to Home</h2>
                        </div>
                    </div>
                </div>}

        </div>}


    </>);
}


function CollapsibleChart({ index, title, chartsOpen, toggleChart, children, type }) {
    return (
        <div className="chart-container">
            <div
                className="chart-header-container"
                onClick={() => toggleChart(index)}
            >
                <div className="chart-header-text">{title}</div>
                <div
                    className={`chart-header-arrow ${chartsOpen[index] ? 'open' : 'closed'
                        }`}
                ></div>
            </div>

            {chartsOpen[index] && (
                <div className={`chart-body ${type}`}>
                    {children}
                </div>
            )}
        </div>
    );
}


export default HomeScreen;
