import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import ReactSlider from 'react-slider';
import './LineChart.css';
import ErrorBoundary from './ErrorBoundary';

import homeIcon from '/images/home.svg'


const LineChart = ({ argsObject }) => {
    const { data, type, dateWindow, seasonUpperBounds, formatDate, getCurHistoryPeriod, endSeason, decSeason,
        leftArrowClick, rightArrowClick
    } = argsObject;

    let { filledPersonalData, filledMemberData, filledPpgData, filledDowData,
        combPersonalData, combMemberData, combPpgData
    } = {};

    if (type === 'filament') {
        filledPersonalData = data.filledPersonalData;
        filledMemberData = data.filledMemberData;
        filledPpgData = data.filledPpgData;
    } else if (type === 'dow') {
        filledDowData = data.filledDowData;
    } else if (type === 'avg_filament') {
        combPersonalData = data.combPersonalData;
        combMemberData = data.combMemberData;
        combPpgData = data.combPpgData;
    }

    const lineRef = useRef(null);
    const dateLen = dateWindow.length;

    const [dateRange, setDateRange] = useState("Past 3 Months");
    const [aggregationLevel, setAggregationlevel] = useState("Daily");

    // window data
    const [sliderRange, setSliderRange] = useState({ min: 0, max: dateLen ? Math.min(90, dateLen) : 90 });
    const [sliderValues, setSliderValues] = useState([0, dateLen ? Math.min(90, dateLen) : 90]);

    // dow data
    const [dowSeason, setDowSeason] = useState({ seasonEnc: 2, year: 2025 });
    // let dowList = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    let dowLabels = [];
    dowLabels.push('12 AM')
    for (let i = 1; i < 12; i++) {
        dowLabels.push(`${i} AM`);
    }
    dowLabels.push('12 PM')
    for (let i = 1; i < 12; i++) {
        dowLabels.push(`${i} PM`);
    }

    // initialize the dow season for dow charts
    useEffect(() => {
        setDowSeason(getCurHistoryPeriod())
    }, [])

    // Linear regression using least squares
    function linearRegression(yValues) {
        const n = yValues.length;
        if (n === 0) return [];

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;

        for (let i = 0; i < n; i++) {
            const x = i;
            const y = yValues[i];

            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        return yValues.map((_, i) => {
            let value = slope * i + intercept
            return Math.max(value.toFixed(1), 0);
        });
    }

    const handleDropdownChange = (event) => {
        const value = event.target.value;
        setDateRange(value);

        // Adjust the slider range based on the dropdown selection
        switch (value) {
            case "Past Week":
                setSliderRange({ min: 0, max: Math.min(7, dateLen) });
                setSliderValues([0, Math.min(7, dateLen)]);
                break;
            case "Past Month":
                setSliderRange({ min: 0, max: Math.min(30, dateLen) });
                setSliderValues([0, Math.min(30, dateLen)]);
                break;
            case "Past 3 Months":
                setSliderRange({ min: 0, max: Math.min(90, dateLen) });
                setSliderValues([0, Math.min(90, dateLen)]);
                break;
            case "Past Year":
                setSliderRange({ min: 0, max: Math.min(365, dateLen) });
                setSliderValues([0, Math.min(365, dateLen)]);
                break;
            case "All Time":
                setSliderRange({ min: 0, max: dateLen });
                setSliderValues([0, dateLen]);
                break;
            default:
                break;
        }
    };

    const handleAggregationLevelChange = (event) => {
        const value = event.target.value;
        setAggregationlevel(value);
    };

    const handleSliderChange = (values) => {
        setSliderValues(values);
    };

    // create the chart
    useEffect(() => {
        if (!lineRef.current) return;
        let datasets;

        if (type === 'filament') {
            datasets = [
                {
                    label: 'Personal Filament', data: [], fill: true,
                    backgroundColor: 'rgba(255,100,100,0.1)', borderColor: 'rgba(255, 100, 100, 1)', tension: 0.05,
                },
                {
                    label: 'Member Filament', data: [], fill: true,
                    backgroundColor: 'rgba(75,192,192,0.1)', borderColor: 'rgba(75, 192, 192, 1)', tension: 0.05,
                },
                {
                    label: 'Pay-per-gram Filament', data: [], fill: true,
                    backgroundColor: 'rgba(75,192,75,0.1)', borderColor: 'rgba(87, 223, 102, 1)', tension: 0.05,
                },
                {
                    label: 'Total', data: [], fill: false,
                    borderColor: 'rgba(0, 0, 0, 1)', tension: 0.05,
                },
                {
                    label: 'Total Trend', data: [], fill: false,
                    borderColor: 'rgba(0, 0, 0, 0.6)', borderDash: [20, 10], pointRadius: 0, tension: 0,
                },
            ]
        } else if (type === 'dow') {
            datasets = [
                {
                    label: 'Monday', data: [], fill: false,
                    borderColor: '#FFD93D', tension: 0.05,
                },
                {
                    label: 'Tuesday', data: [], fill: false,
                    borderColor: '#6BCB77', tension: 0.05,
                },
                {
                    label: 'Wednesday', data: [], fill: false,
                    borderColor: '#4D96FF', tension: 0.05,
                },
                {
                    label: 'Thursday', data: [], fill: false,
                    borderColor: '#845EC2', tension: 0.05,
                },
                {
                    label: 'Friday', data: [], fill: false,
                    borderColor: '#FF9671', tension: 0.05,
                },
                {
                    label: 'Saturday', data: [], fill: false,
                    borderColor: '#00CFC1', tension: 0.05,
                },
                {
                    label: 'Sunday', data: [], fill: false,
                    borderColor: '#FF6B6B', tension: 0.05,
                },
            ]
        } else if (type === 'avg_filament') {
            datasets = [
                {
                    label: 'Average', data: [], fill: false,
                    borderColor: 'rgba(0, 0, 0, 1)', tension: 0.05,
                },
            ]
        }


        const ctx = lineRef.current.getContext('2d');
        let lastX = null;
        lineRef.current.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: datasets,
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        intersect: false,
                        mode: 'index'
                    },
                },
                scales: {
                    y: { beginAtZero: true },
                },
            },
            plugins: [{
                id: 'verticalLinePlugin', beforeDatasetsDraw: (chart) => {
                    const { ctx, chartArea } = chart; // Fetch active tooltip elements 
                    const activeElements = chart?.tooltip?.getActiveElements(); if (activeElements?.length > 0) {
                        const { x } = activeElements[0].element; // Interpolate the line position to transition to the new position 
                        if (lastX === null) lastX = x;
                        lastX += (x - lastX) * 0.25;
                        ctx.save(); ctx.beginPath();
                        ctx.moveTo(lastX, chartArea.top);
                        ctx.lineTo(lastX, chartArea.bottom);
                        ctx.lineWidth = 1; ctx.strokeStyle = 'black';
                        ctx.stroke();
                        ctx.restore();
                    } else {
                        // Reset the line when not hovering 
                        lastX = null;
                    }
                },
            },],
        });

        return () => {
            lineRef?.current?.chart?.destroy();
        };
    }, []);

    // update the data when parameters change
    useEffect(() => {
        const chart = lineRef?.current?.chart;
        if (!chart) return;

        if (type === 'filament') {

            let personalSubset, memberSubset, ppgSubset, dateSubset;

            // limit to the selected day range from the sliders
            if (sliderValues[0] === 0) {
                personalSubset = filledPersonalData.slice(-sliderValues[1]);
                memberSubset = filledMemberData.slice(-sliderValues[1]);
                ppgSubset = filledPpgData.slice(-sliderValues[1]);
                dateSubset = dateWindow.slice(-sliderValues[1]);
            } else {
                personalSubset = filledPersonalData.slice(-sliderValues[1], -sliderValues[0]);
                memberSubset = filledMemberData.slice(-sliderValues[1], -sliderValues[0]);
                ppgSubset = filledPpgData.slice(-sliderValues[1], -sliderValues[0]);
                dateSubset = dateWindow.slice(-sliderValues[1], -sliderValues[0]);
            }

            // aggregate over the chosen level and assign back to the subset variables
            let aggregatedData = aggregateByLevel(dateSubset, personalSubset, memberSubset, ppgSubset, aggregationLevel);
            //  console.log(`${aggregationLevel} aggregated data: `, aggregatedData);
            personalSubset = Object.entries(aggregatedData).map(o => o[1].personal)
            ppgSubset = Object.entries(aggregatedData).map(o => o[1].ppg)
            memberSubset = Object.entries(aggregatedData).map(o => o[1].member)
            dateSubset = Object.entries(aggregatedData).map(o => o[0])


            const totalData = ppgSubset.map((_, i) =>
                parseInt(personalSubset[i]) +
                parseInt(memberSubset[i]) +
                parseInt(ppgSubset[i])
            );

            const totalTrend = linearRegression(totalData);

            chart.data.labels = dateSubset;
            chart.data.datasets[0].data = personalSubset;
            chart.data.datasets[1].data = memberSubset;
            chart.data.datasets[2].data = ppgSubset;
            chart.data.datasets[3].data = totalData;
            chart.data.datasets[4].data = totalTrend;
        } else if (type === 'dow') {
            console.log('filledDowData: ', filledDowData);
            let dowSubset;
            if (dowSeason.year === -1) {
                dowSubset = filledDowData
            } else {
                dowSubset = filledDowData.filter(o => {
                    return (o.year === dowSeason.year) && (o.seasonEnc === dowSeason.seasonEnc);
                })
            }


            chart.data.labels = dowLabels;
            for (let i = 0; i < 7; i++) {
                let dowReduced = dowSubset.filter(o => {
                    return o.dow == i
                }).reduce((acc, { hour, cnt }) => {
                    acc[hour] = (acc[hour] || 0) + cnt;
                    return acc;
                }, {})

                let dowReducedArr = Object.keys(dowReduced).map(h => ({
                    hour: Number(h),
                    cnt: dowReduced[h]
                }));

                let dowFiltered = dowReducedArr.sort((a, b) => (a.hour - b.hour)).map(o => o.cnt)
                chart.data.datasets[i].data = dowFiltered;
            }
        } else if (type === 'avg_filament') {
             let personalSumSubset, memberSumSubset, ppgSumSubset;
             let personalCntSubset, memberCntSubset, ppgCntSubset;

             let dateSubset;


            // limit to the selected day range from the sliders
            if (sliderValues[0] === 0) {
                personalSumSubset = combPersonalData[1].slice(-sliderValues[1]);
                memberSumSubset = combMemberData[1].slice(-sliderValues[1]);
                ppgSumSubset = combPpgData[1].slice(-sliderValues[1]);
                personalCntSubset = combPersonalData[0].slice(-sliderValues[1]);
                memberCntSubset = combMemberData[0].slice(-sliderValues[1]);
                ppgCntSubset = combPpgData[0].slice(-sliderValues[1]);
                dateSubset = dateWindow.slice(-sliderValues[1]);
            } else {
                personalSumSubset = combPersonalData[1].slice(-sliderValues[1], -sliderValues[0]);
                memberSumSubset = combMemberData[1].slice(-sliderValues[1], -sliderValues[0]);
                ppgSumSubset = combPpgData[1].slice(-sliderValues[1], -sliderValues[0]);
                personalCntSubset = combPersonalData[0].slice(-sliderValues[1], -sliderValues[0]);
                memberCntSubset = combMemberData[0].slice(-sliderValues[1], -sliderValues[0]);
                ppgCntSubset = combPpgData[0].slice(-sliderValues[1], -sliderValues[0]);
                dateSubset = dateWindow.slice(-sliderValues[1], -sliderValues[0]);
            }

            // aggregate over the chosen level and assign back to the subset variables
            let aggregatedSumData = aggregateByLevel(dateSubset, personalSumSubset, memberSumSubset, ppgSumSubset, aggregationLevel);
            let aggregatedCntData = aggregateByLevel(dateSubset, personalCntSubset, memberCntSubset, ppgCntSubset, aggregationLevel);

            //  console.log(`${aggregationLevel} aggregated data: `, aggregatedData);
            personalSumSubset = Object.entries(aggregatedSumData).map(o => o[1].personal)
            ppgSumSubset = Object.entries(aggregatedSumData).map(o => o[1].ppg)
            memberSumSubset = Object.entries(aggregatedSumData).map(o => o[1].member)
            personalCntSubset = Object.entries(aggregatedCntData).map(o => o[1].personal)
            ppgCntSubset = Object.entries(aggregatedCntData).map(o => o[1].ppg)
            memberCntSubset = Object.entries(aggregatedCntData).map(o => o[1].member)
            dateSubset = Object.entries(aggregatedSumData).map(o => o[0])


            const sumData = ppgSumSubset.map((_, i) =>
                parseInt(personalSumSubset[i]) +
                parseInt(memberSumSubset[i]) +
                parseInt(ppgSumSubset[i])
            );
            const cntData = ppgCntSubset.map((_, i) =>
                parseInt(personalCntSubset[i]) +
                parseInt(memberCntSubset[i]) +
                parseInt(ppgCntSubset[i])
            );


            const avgData = cntData.map((_, i) => {
                let avg = (sumData[i] / cntData[i]).toFixed(2);
                // if (avg == "NaN") {
                //     return 0;
                // }
                return avg;
            })


            chart.data.labels = dateSubset;
            chart.data.datasets[0].data = avgData;
        }


        chart.update('none');
    }, [sliderValues, dateRange, aggregationLevel, dowSeason]);



    // aggregation functions
    const determineSeason = (dateString) => {
        let date = new Date(dateString);
        let year = date.getFullYear();

        let normalizedDate = date.setFullYear(2000);
        let season = normalizedDate < seasonUpperBounds[0] ? 'Spring' : normalizedDate < seasonUpperBounds[1] ? 'Summer' : 'Fall';

        return `${season} ${year}`;
    }


    // aggregates the filament data at a given aggregation level
    const aggregateByLevel = (dates, personal, member, ppg, period) => {
        const aggregatedData = {};

        for (let i = 0; i < dates.length; i++) {
            const dateParts = dates[i].split('/'); // "mm/dd/yyyy"
            const month = dateParts[0].padStart(2, '0');
            const year = dateParts[2];

            let key = formatDate(new Date(dates[i]).toISOString());
            console.log(period)
            if (period === 'Weekly') {
                const date = new Date(dates[i]);
                const dow = date.getDay();
                const diff = (dow === 0 ? -6 : 1 - dow); // if Sunday, go back 6 days; else go back (day-1)
                date.setDate(date.getDate() + diff);
                key = `Wk ${formatDate(date.toISOString())}`;
            } else if (period === 'Monthly') {
                key = `${year}-${month}`;

            } else if (period === 'Seasonal') {
                key = determineSeason(dates[i]);
            }

            if (!aggregatedData[key]) {
                aggregatedData[key] = { personal: 0, member: 0, ppg: 0 };
            }

            aggregatedData[key].personal += parseInt(personal[i]);
            aggregatedData[key].member += parseInt(member[i]);
            aggregatedData[key].ppg += parseInt(ppg[i]);
        }

        return aggregatedData
    };








    return (
        <div className="canvas-wrapper">

            <div className='line-chart'>
                <canvas ref={lineRef}></canvas>
                {
                    ((type === 'filament') || (type === 'avg_filament')) &&

                    <div className="line-options">
                        <div className="slider-container">
                            <ErrorBoundary>
                                <ReactSlider
                                    min={sliderRange.min}
                                    max={sliderRange.max}
                                    markClassName='custom-mark'
                                    className="custom-slider"
                                    trackClassName="custom-track"
                                    marks
                                    thumbClassName="custom-thumb"
                                    pearling
                                    minDistance={3}
                                    value={sliderValues}
                                    onChange={handleSliderChange}
                                    invert={true}
                                    renderThumb={(props, state) => {
                                        const { key, ...rest } = props;
                                        return (
                                            <div key={key} {...rest}>
                                                {(state.valueNow > 999) ? '...' : state.valueNow}
                                            </div>
                                        );
                                    }}
                                />

                            </ErrorBoundary>

                        </div>

                        <select className='line-window-select' value={dateRange} onChange={handleDropdownChange}>
                            <option value="Past Week">Past Week</option>
                            <option value="Past Month">Past Month</option>
                            <option value="Past 3 Months">Past 3 Months</option>
                            <option value="Past Year">Past Year</option>
                            <option value="All Time">All Time</option>
                        </select>
                        <select className='line-window-select' value={aggregationLevel} onChange={handleAggregationLevelChange}>
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Seasonal">Seasonal</option>
                        </select>
                    </div>
                }


                {
                    type === 'dow' &&
                    <div className="season-select-wrapper-line">
                        <div className="season-select">
                            <div className='arrow-btn' style={((dowSeason.year === endSeason.year) && (dowSeason.seasonEnc === endSeason.seasonEnc)) ?
                                { opacity: '30%', cursor: 'default' } : {}} onClick={() => setDowSeason({ ...endSeason })}>
                                <img src={homeIcon} style={{ width: '18px', height: '18px' }}></img>
                            </div>

                            <div className='arrow-btn' style={{ paddingLeft: '5px', paddingRight: '5px', borderRadius: '50px', fontSize: '18px' }}
                                onClick={() => leftArrowClick(dowSeason, setDowSeason)}>&lt;</div>
                            <div style={{ minWidth: "100px", maxWidth: '500px' }}> {(dowSeason.year === -1) ?
                                'All Time Total' :
                                `${decSeason(dowSeason.seasonEnc)} ${dowSeason.year}`
                            }
                            </div>
                            {dowSeason.year !== -1 ?
                                <div className='arrow-btn' style={{ paddingLeft: '5px', paddingRight: '5px', borderRadius: '50px', fontSize: '18px' }}
                                    onClick={() => rightArrowClick(dowSeason, setDowSeason)}>&gt;</div> :
                                <div style={{ width: '39px' }}></div>
                            }
                        </div>
                    </div>
                }




            </div>
        </div >
    )
}

export default LineChart;
