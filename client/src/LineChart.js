import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import ReactSlider from 'react-slider';
import './LineChart.css';
import ErrorBoundary from './ErrorBoundary';


const LineChart = ({ argsObject }) => {
    const { filledPersonalData, filledClubData, filledPpgData, dateWindow, seasonUpperBounds,
        formatDate,
    } = argsObject;

    const lineRef = useRef(null);
    const dateLen = dateWindow.length;

    const [dateRange, setDateRange] = useState("Past 3 Months");
    const [aggregationLevel, setAggregationlevel] = useState("Daily");

    const [sliderRange, setSliderRange] = useState({ min: 0, max: dateLen ? Math.min(90, dateLen) : 90 });
    const [sliderValues, setSliderValues] = useState([0, dateLen ? Math.min(90, dateLen) : 90]);

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

        const ctx = lineRef.current.getContext('2d');
        let lastX = null;
        lineRef.current.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Personal Filament', data: [], fill: true,
                        backgroundColor: 'rgba(255,100,100,0.1)', borderColor: 'rgba(255, 100, 100, 1)', tension: 0.05,
                        pointHitRadius: 10,
                    },
                    {
                        label: 'Club Filament', data: [], fill: true,
                        backgroundColor: 'rgba(75,192,192,0.1)', borderColor: 'rgba(75, 192, 192, 1)', tension: 0.05,
                        pointHitRadius: 10,
                    },
                    {
                        label: 'Pay-per-gram Filament', data: [], fill: true,
                        backgroundColor: 'rgba(75,192,75,0.1)', borderColor: 'rgba(87, 223, 102, 1)', tension: 0.05,
                        pointHitRadius: 10,
                    },
                    {
                        label: 'Total', data: [], fill: false,
                        borderColor: 'rgba(0, 0, 0, 1)', tension: 0.05,pointHitRadius: 10,
                    },
                    {
                        label: 'Total Trend', data: [], fill: false,
                        borderColor: 'rgba(0, 0, 0, 0.6)', borderDash: [20, 10], pointRadius: 0, tension: 0,pointHitRadius: 10,
                    },
                ],
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        intersect: true,   
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

        let personalSubset, clubSubset, ppgSubset, dateSubset;

        // limit to the selected day range from the sliders
        if (sliderValues[0] === 0) {
            personalSubset = filledPersonalData.slice(-sliderValues[1]);
            clubSubset = filledClubData.slice(-sliderValues[1]);
            ppgSubset = filledPpgData.slice(-sliderValues[1]);
            dateSubset = dateWindow.slice(-sliderValues[1]);
        } else {
            personalSubset = filledPersonalData.slice(-sliderValues[1], -sliderValues[0]);
            clubSubset = filledClubData.slice(-sliderValues[1], -sliderValues[0]);
            ppgSubset = filledPpgData.slice(-sliderValues[1], -sliderValues[0]);
            dateSubset = dateWindow.slice(-sliderValues[1], -sliderValues[0]);
        }

        // aggregate over the chosen level and assign back to the subset variables
        let aggregatedData = aggregateByLevel(dateSubset, personalSubset, clubSubset, ppgSubset, aggregationLevel);
        //  console.log(`${aggregationLevel} aggregated data: `, aggregatedData);
        personalSubset = Object.entries(aggregatedData).map(o => o[1].personal)
        ppgSubset = Object.entries(aggregatedData).map(o => o[1].ppg)
        clubSubset = Object.entries(aggregatedData).map(o => o[1].club)
        dateSubset = Object.entries(aggregatedData).map(o => o[0])


        const totalData = ppgSubset.map((_, i) =>
            parseInt(personalSubset[i]) +
            parseInt(clubSubset[i]) +
            parseInt(ppgSubset[i])
        );

        const totalTrend = linearRegression(totalData);

        chart.data.labels = dateSubset;
        chart.data.datasets[0].data = personalSubset;
        chart.data.datasets[1].data = clubSubset;
        chart.data.datasets[2].data = ppgSubset;
        chart.data.datasets[3].data = totalData;
        chart.data.datasets[4].data = totalTrend;

        chart.update('none');
    }, [sliderValues, dateRange, aggregationLevel]);



    // aggregation functions
    const determineSeason = (dateString) => {
        let date = new Date(dateString);
        let year = date.getFullYear();

        let normalizedDate = date.setFullYear(2000);
        let season = normalizedDate < seasonUpperBounds[0] ? 'Spring' : normalizedDate < seasonUpperBounds[1] ? 'Summer' : 'Fall';

        return `${season} ${year}`;
    }

    const aggregateByLevel = (dates, personal, club, ppg, period) => {
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
                aggregatedData[key] = { personal: 0, club: 0, ppg: 0 };
            }

            aggregatedData[key].personal += parseInt(personal[i]);
            aggregatedData[key].club += parseInt(club[i]);
            aggregatedData[key].ppg += parseInt(ppg[i]);
        }

        return aggregatedData
    };















    return (
        <div className="canvas-wrapper">

            <div className='line-chart'>
                <canvas ref={lineRef}></canvas>
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
                                            {state.valueNow}
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
            </div>
        </div >
    )
}

export default LineChart;
