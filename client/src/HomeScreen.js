import React, { useEffect, useRef, useState } from 'react';
import Axios from 'axios';

import LineChart from './LineChart';
import PieChart from './PieChart';

import ErrorBoundary from './ErrorBoundary';

import loadingGif from '/images/loading.gif'
import xIcon from '/images/x.png';
import noSignalIcon from '/images/no_signal.svg';
import TrendingPrints from './TrendingPrints';
import StlPreview from './StlPreview';

import './HomeScreen.css';

function HomeScreen({ homeScreenArgs }) {
    let { sidebarOpen, sidebarWidth, loading, setLoading, selectedPrinter, menuOpen,
        truncateString, generalSettings, getDirectDownloadLink, serverURL, PrintHistoryTable,
        printHistoryArgs, printerList, formatDate, getStatusColor, seasonUpperBounds,
        decSeason, getCurHistoryPeriod, endSeason, leftArrowClick, rightArrowClick
    } = homeScreenArgs;



    // Page control
    const [pagesMounted, setPagesMounted] = useState([true, false]); // controls DOM mounting
    const [currentPage, setCurrentPage] = useState(0); // controls which page is visible
    const [chartsOpen, setChartsOpen] = useState([true, false, false, false, false, false, false])

    // Summary data
    const [supervisorData, setSupervisorData] = useState([]);
    const [nameFilamentData, setNameFilamentData] = useState([]);
    const [printerStatuses, setPrinterStatuses] = useState({});
    const [printerObjs, setPrinterObjs] = useState([]);

    const [recentFiles, setRecentFiles] = useState([]);
    const [dailyPrint, setDailyPrint] = useState([]);
    const [potdStatus, setPotdStatus] = useState('loading')
    const hasFetchedDailyPrint = useRef(false);

    const [linePersonalData, setLinePersonalData] = useState([]);
    const [lineMemberData, setLineMemberData] = useState([]);
    const [linePpgData, setLinePpgData] = useState([]);
    const [lineDateWindow, setLineDateWindow] = useState([]);

    const [filledDowData, setFilledDowData] = useState([]);

    let lineArgs = { dateWindow: lineDateWindow, seasonUpperBounds, formatDate, getCurHistoryPeriod, endSeason, decSeason, 
        leftArrowClick, rightArrowClick
     }
    let pieArgs = { decSeason, getCurHistoryPeriod, endSeason, leftArrowClick, rightArrowClick }

    // useEffect hooks

    // server health check and loading state control, cancel once it works
    useEffect(() => {
        if (loading !== 'error') return;

        let cancelled = false;

        const poll = async () => {
            try {
                await Axios.get(`${serverURL}/api/getLocalData`, { timeout: 3000 });
                if (!cancelled) {
                    console.log(`*** SERVER HEALTH *** Server reconnected!`);
                    window.location.reload();
                }
            } catch {
                console.log(`*** SERVER HEALTH *** Server disconnected. Polling ${serverURL} every 5 seconds...`);
            }
        };
        // poll every 5 seconds after initial attempt
        poll();
        const interval = setInterval(poll, 5000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [loading, serverURL]);


    // pull the chart data from the server
    useEffect(() => {
        if (selectedPrinter || (printerList.length === 0)) return;

        console.log('fetching chart data...')
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
                    if (generalSettings?.debugMode) console.log('setting trending print: ', dailyPrintTemp);
                    setPotdStatus('done')
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
                dateArray.push(formatDate(currentDate.toISOString(), false))
                currentDate.setDate(currentDate.getDate() + 1);
            }

            return dateArray;
        };

        try {
            Axios.get(`${serverURL}/api/getprinterdata`).then((response) => {
                if (generalSettings?.debugMode) console.log("printer name data: ", response.data.res);
                const printerData = response.data.res;

                setPrinterObjs(printerData);

                try {
                    Axios.get(`${serverURL}/api/getsupervisordata`).then((response) => {
                        if (generalSettings?.debugMode) console.log('supervisor data: ', response.data.res)
                        setSupervisorData(response.data.res);
                        Axios.get(`${serverURL}/api/getnamefilamentdata`).then((response) => {
                            if (generalSettings?.debugMode) console.log('filament name data: ', response.data.res)
                            setNameFilamentData(response.data.res);
                            if (generalSettings?.debugMode) console.log()

                            Axios.get(`${serverURL}/api/getdailyprints`).then((dailyResponse) => {
                                if (generalSettings?.debugMode) console.log("daily data: ", dailyResponse.data);
                                Axios.get(`${serverURL}/api/getdowprints`).then((dowResponse) => {
                                    if (generalSettings?.debugMode) console.log("dow data: ", dowResponse.data);
                                    // daily data processing for daily line charts
                                    if (dailyResponse.data) {
                                        const dailyData = dailyResponse.data.res;
                                        const personal = dailyData.filter(item => item.paid === 'personal')
                                        const member = dailyData.filter(item => item.paid === 'member')
                                        const ppg = dailyData.filter(item => item.paid === 'per-gram')

                                        const startDate = dailyData.length > 0 ? formatDate(new Date(dailyData[0].date).toISOString()) : null;
                                        const endDate = formatDate(new Date().toISOString());

                                        const fillData = (rawData, fullSet, valueField, type = 'date') => {
                                            if (type === 'date') {
                                                const map = new Map(rawData.map(row => [formatDate(row[type], false), row[valueField]]));
                                                const filled = fullSet.map(date => map.get(date) || 0);
                                                return filled
                                            }
                                        }

                                        if (startDate && endDate) {
                                            const allDates = generateDateRange(startDate, endDate);
                                            // Fill the data and assign them to useState variables by paid type
                                            setLinePersonalData([fillData(personal, allDates, 'cnt', 'date'), fillData(personal, allDates, 'sum', 'date')]);
                                            setLineMemberData([fillData(member, allDates, 'cnt', 'date'), fillData(member, allDates, 'sum', 'date')]);
                                            setLinePpgData([fillData(ppg, allDates, 'cnt', 'date'), fillData(ppg, allDates, 'sum', 'date')]);
                                            setLineDateWindow(allDates);
                                        }
                                    }

                                    // day of weelk (dow) data processing for dow line chart
                                    if (dowResponse.data) {
                                        setFilledDowData(dowResponse.data.res);
                                    }

                                    setLoading('done');
                                });

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
    }, [selectedPrinter, serverURL, printerList])

    // do client-side aggregation on the printer list to get the printer status data
    useEffect(() => {
        const statusCounts = printerList.reduce((acc, item) => {
            const key = item.status;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        setPrinterStatuses(Object.entries(statusCounts).map(([status, count]) => ({ status, count })).sort((a, b) => {
            let diff = b.count - a.count;
            if (diff === 0) {
                diff = a.status.localeCompare(b.status);
            }
            return diff;
        }));
    }, [printerList])





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
        {(!selectedPrinter) && <div ref={wrapperRef} className={`page-wrapper ${(currentPage == 1) ? 'slide-left' : ''}`}>

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
                            <h1 className={'menu-title ' + ((!selectedPrinter) ? '' : 'hidden')}><b>🔥 Trending Prints</b></h1>
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

                            <h1 className={'menu-title ' + ((!selectedPrinter) ? '' : 'hidden')}><b>🕜 Recently Printed Files</b></h1>
                            <div className={'stl-previews ' + ((!selectedPrinter) ? '' : 'hidden')}>
                                <ErrorBoundary>
                                    {recentFiles.map((file, index) => {
                                        if (generalSettings.showFilePreviews) {
                                            return (
                                                <div className={'stl-preview '} key={index}><StlPreview googleDriveLink={file.file} name={file.name || ("File " + index)} 
                                                getDirectDownloadLink={getDirectDownloadLink} serverURL={serverURL} rotateInit={true}></StlPreview></div>
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
                            <h2 className="title-text">Landing Page</h2>
                        </div>
                    </div>



                    {/* Charts below */}
                    {loading === 'done' && <div>
                        <div className='group-title'> General </div>
                        <CollapsibleChart index={0} title="Lab Printer Status Composition"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'pie pad-med'}>
                            <PieChart argsObject={{
                                dataObj: printerStatuses,
                                dataField: 'count',
                                labelField: 'status',
                                pieArgs: pieArgs,
                                backgroundColor: printerStatuses.map(p => getStatusColor(p.status)),
                            }} />
                        </CollapsibleChart>

                        <div className='group-title'> Line Charts </div>
                        <CollapsibleChart index={1} title="Number of Prints Over Time"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'line pad-med'}>
                            <LineChart argsObject={{
                                data: {
                                    filledPersonalData: linePersonalData[0],
                                    filledMemberData: lineMemberData[0],
                                    filledPpgData: linePpgData[0]
                                },
                                type: 'filament',
                                ...lineArgs
                            }} />

                        </CollapsibleChart>

                        <CollapsibleChart index={3} title="Filament Used Over Time (g)"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'line pad-med'}>
                            <LineChart argsObject={{
                                data: {
                                    filledPersonalData: linePersonalData[1],
                                    filledMemberData: lineMemberData[1],
                                    filledPpgData: linePpgData[1]
                                },
                                type: 'filament',
                                ...lineArgs
                            }} />
                        </CollapsibleChart>

                        <CollapsibleChart index={4} title="Average Filament Per Print Over Time (g)"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'line pad-med'}>
                            <LineChart argsObject={{
                                data: {
                                    combPersonalData: linePersonalData,
                                    combMemberData: lineMemberData,
                                    combPpgData: linePpgData
                                },
                                type: 'avg_filament',
                                ...lineArgs
                            }} />
                        </CollapsibleChart>

                        <CollapsibleChart index={5} title="Prints By Hour & Day Of Week"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'line no-pad'}>
                            <LineChart argsObject={{
                                data: {
                                    filledDowData: filledDowData
                                },
                                type: 'dow',
                                ...lineArgs
                            }} />
                        </CollapsibleChart>
                        


                        <div className='group-title'> Pie Charts </div>
                        <CollapsibleChart index={6} title="Number of Jobs Per Printer"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'pie pad-large'}>
                            <PieChart argsObject={{
                                dataObj: printerObjs,
                                dataField: 'cnt',
                                labelField: 'printerName',
                                pieArgs: pieArgs,
                                seasonSelect: true,
                            }} />
                        </CollapsibleChart>

                        <CollapsibleChart index={7} title="Filament Used Per Printer (g)"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'pie pad-large'}>
                            <PieChart argsObject={{
                                dataObj: printerObjs,
                                dataField: 'sum',
                                labelField: 'printerName',
                                pieArgs: pieArgs,
                                seasonSelect: true,
                            }} />
                        </CollapsibleChart>


                        <CollapsibleChart index={8} title="Number of Prints by Supervisor"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'pie pad-large'}>
                            <PieChart argsObject={{
                                dataObj: supervisorData,
                                dataField: 'cnt',
                                labelField: 'supervisorName',
                                pieArgs: pieArgs,
                                seasonSelect: true,
                            }} />
                        </CollapsibleChart>

                        <CollapsibleChart index={9} title="Filament Used by Supervisor (g)"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'pie pad-large'}>
                            <PieChart argsObject={{
                                dataObj: supervisorData,
                                dataField: 'sum',
                                labelField: 'supervisorName',
                                pieArgs: pieArgs,
                                seasonSelect: true,
                            }} />
                        </CollapsibleChart>

                        <CollapsibleChart index={10} title="Number of Prints by Person"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'pie pad-large'}>
                            <PieChart argsObject={{
                                dataObj: nameFilamentData,
                                dataField: 'cnt',
                                labelField: 'name',
                                pieArgs: pieArgs,
                                seasonSelect: true,
                            }} />
                        </CollapsibleChart>

                        <CollapsibleChart index={11} title="Filament Used by Person (g)"
                            chartsOpen={chartsOpen} toggleChart={toggleChart} bodyClass={'pie pad-large'}>
                            <PieChart argsObject={{
                                dataObj: nameFilamentData,
                                dataField: 'sum',
                                labelField: 'name',
                                pieArgs: pieArgs,
                                seasonSelect: true,
                            }} />
                        </CollapsibleChart>

                    </div>
                    }

                    <div className="title-box" style={{ marginTop: '30px', marginBottom: '120px' }} onClick={() => { handlePageChange(0) }}>
                        <div className="title-container">
                            <div className="slide-arrow left"></div>
                            <h2 className="title-text">Landing Page</h2>
                        </div>
                    </div>

                </div>}

        </div>}


    </>);
}


function CollapsibleChart({ index, title, chartsOpen, toggleChart, children, bodyClass }) {
    return (
        <div className="chart-container">
            <div
                className="chart-header-container"
                onClick={() => toggleChart(index)}
            >
                <div className="chart-header-text">{title}</div>
                <div
                    className={`chart-header-arrow ${chartsOpen[index] ? 'open' : 'closed'}`}
                ></div>
            </div>

            {chartsOpen[index] && (
                <div className={`chart-body ${bodyClass}`}>
                    {children}
                </div>
            )}
        </div>
    );
}


export default HomeScreen;
