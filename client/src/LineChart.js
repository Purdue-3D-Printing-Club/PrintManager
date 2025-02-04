import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import ReactSlider from 'react-slider';
import './LineChart.css';

const LineChart = ({ argsObject, index }) => {
    const { filledPersonalData, filledClubData, dateWindow } = argsObject;

    const lineRef = useRef(null);
    const dateLen = dateWindow.length;

    const [dateRange, setDateRange] = useState("Past 3 Months");
    const [sliderRange, setSliderRange] = useState({ min: 0, max: dateLen ? Math.min(90, dateLen) : 90 });
    const [sliderValues, setSliderValues] = useState([0, dateLen? Math.min(90, dateLen) : 90]);


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

    const handleSliderChange = (values) => {
        console.log(`settings slider ${index} values to `, values)
        setSliderValues(values);
    };

    useEffect(() => {
        if (filledPersonalData && filledClubData && dateWindow) {
            // console.log('filledPersonalData: ', filledPersonalData)
            // console.log('filledClubData: ', filledClubData)
            // console.log('dateWindow: ', dateWindow)

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

            let personalSubset = null;
            let clubSubset = null;
            let dateSubset = null;

            if (sliderValues[0] === 0) {
                personalSubset = filledPersonalData.slice(-sliderValues[1]);
                clubSubset = filledClubData.slice(-sliderValues[1]);
                dateSubset = dateWindow.slice(-sliderValues[1]);
            } else {
                personalSubset = filledPersonalData.slice(-sliderValues[1], -sliderValues[0]);
                clubSubset = filledClubData.slice(-sliderValues[1], -sliderValues[0]);
                dateSubset = dateWindow.slice(-sliderValues[1], -sliderValues[0]);
            }


            // console.log('personalSubset: ', personalSubset)
            // console.log('clubSubset: ', clubSubset)
            // console.log('dateSubset: ', dateSubset)

            createLineChart(lineRef, personalSubset, clubSubset, dateSubset);
        }
    })



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
                                    invert={true}
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
                            </select>
                        </div>
                    </div>

                </>
                    :
                    <>
                        <div className='line-chart'>
                            <h2 style={{ marginBottom: "10px" }}>Total Filament Usage By Day (g)</h2>
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
                                        invert={true}
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
                                </select>
                            </div>
                        </div>
                    </>
            }
        </>
    )
}

export default LineChart;
