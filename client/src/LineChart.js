import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import Axios from 'axios';
import ReactSlider from 'react-slider';
import './LineChart.css';

const LineChart = ({ argsObject, index }) => {
    const { formatDate, setLoading, setLoadingSummary, setFrequencies, setFilamentSum,
        serverURL, setSupervisorData, setNameFilamentData, setPrinterNames } = argsObject;
    const lineRef = useRef(null);

    const [dateRange, setDateRange] = useState("Past Week");
    const [sliderRange, setSliderRange] = useState({ min: 0, max: 7 });
    const [sliderValues, setSliderValues] = useState([1, 6]);

    const handleDropdownChange = (event) => {
        const value = event.target.value;
        setDateRange(value);

        // Adjust the slider range based on the dropdown selection
        switch (value) {
            case "Past Week":
                setSliderRange({ min: 0, max: 7 });
                setSliderValues([1, 6]);
                break;
            case "Past Month":
                setSliderRange({ min: 0, max: 30 });
                setSliderValues([5, 25]);
                break;
            case "Past 3 Months":
                setSliderRange({ min: 0, max: 90 });
                setSliderValues([10, 80]);
                break;
            case "Past Year":
                setSliderRange({ min: 0, max: 365 });
                setSliderValues([50, 300]);
                break;
            case "All Time":
                setSliderRange({ min: 0, max: 1000 });
                setSliderValues([100, 900]);
                break;
            default:
                break;
        }
    };

    const handleSliderChange = (values) => {
        console.log(`settings slider ${index} values to `, values)
        setSliderValues(values);
    };

    useEffect(() => {
        const createLineChart = (ref, filledPersonalData, filledClubData, dateWindow) => {

            // Destroy existing chart if it already exists
            if (ref.current.chart) {
                ref.current.chart.destroy();
            }

            let lastX = null;

            // Create the line chart
            const ctx = ref.current.getContext('2d');
            ref.current.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dateWindow,
                    datasets: [{
                        label: 'Personal Filament',
                        data: filledPersonalData,
                        fill: true,
                        backgroundColor: 'rgba(255,100,100,0.1)',
                        borderColor: 'rgba(255, 100, 100, 1)',
                        tension: 0.1,
                    },
                    {
                        label: 'Club Filament',
                        data: filledClubData,
                        fill: true,
                        backgroundColor: 'rgba(75,192,192,0.1)',
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
                plugins: [
                    {
                        id: 'verticalLinePlugin',
                        beforeDatasetsDraw: (chart) => {
                            const { ctx, chartArea } = chart;

                            // Fetch active tooltip elements
                            const activeElements = chart.tooltip.getActiveElements();

                            if (activeElements.length > 0) {
                                const { x } = activeElements[0].element;

                                // Interpolate the line position to transition to the new position
                                if (lastX === null) lastX = x;
                                lastX += (x - lastX) * 0.25;

                                ctx.save();
                                ctx.beginPath();
                                ctx.moveTo(lastX, chartArea.top);
                                ctx.lineTo(lastX, chartArea.bottom);
                                ctx.lineWidth = 1;
                                ctx.strokeStyle = 'black';
                                ctx.stroke();
                                ctx.restore();
                            } else {
                                // Reset the line when not hovering
                                lastX = null;
                            }
                        },
                    },
                ],
            });
        };

        const generateDateRange = (startDate, endDate) => {
            const dateArray = [];
            let currentDate = new Date(startDate);

            while (currentDate <= new Date(endDate)) {
                dateArray.push(formatDate(new Date(currentDate), false));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            return dateArray;
        };
        console.log(`### loading line chart ${index}...`)
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

                                        if (index === 1) {
                                            const personalDataMap = new Map(personal.map(day => [formatDate(day.date, false), day.cnt]));
                                            const clubDataMap = new Map(club.map(day => [formatDate(day.date, false), day.cnt]));

                                            // Fill in missing dates with 0
                                            const filledPersonalCnt = allDates.map(date => personalDataMap.get(date) || 0);
                                            const filledClubCnt = allDates.map(date => clubDataMap.get(date) || 0);

                                            createLineChart(lineRef, filledPersonalCnt, filledClubCnt, allDates)
                                        }

                                        if (index === 2) {
                                            const personalDataMap = new Map(personal.map(day => [formatDate(day.date, false), day.sum]));
                                            const clubDataMap = new Map(club.map(day => [formatDate(day.date, false), day.sum]));

                                            // Fill in missing dates with 0
                                            const filledPersonalSum = allDates.map(date => personalDataMap.get(date) || 0);
                                            const filledClubSum = allDates.map(date => clubDataMap.get(date) || 0);

                                            createLineChart(lineRef, filledPersonalSum, filledClubSum, allDates)
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
    }, [])



    return (
        <>
            {
                index === 1 ? <>
                    <div className='line-chart'>
                        <h2 style={{ marginBottom: "10px" }}>Total Prints By Day</h2>
                        <canvas ref={lineRef} width="400" height="300"></canvas>
                        <div className="line-options">
                            <div className="slider-container">
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

                                    
                                    renderThumb={(props, state) => <div {...props}>
                                        {state.valueNow}
                                    </div>} />

                            </div>

                            <select className='line-window-select' value={dateRange} onChange={handleDropdownChange}>
                                <option value="Past Week">Past Week</option>
                                <option value="Past Month">Past Month</option>
                                <option value="Past 3 Months">Past 3 Months</option>
                                <option value="Past Year">Past Year</option>
                                <option value="All Time">All Time</option>
                            </select></div>

                    </div>

                </>
                    :
                    <div className='line-chart'>
                        <h2 style={{ marginBottom: "10px" }}>Total Filament Usage By Day (g)</h2>
                        <canvas ref={lineRef} width="400" height="300"></canvas>
                    </div>
            }
        </>
    )
}

export default LineChart;
