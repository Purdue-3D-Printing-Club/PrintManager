import React, { useState, useEffect } from 'react'
import { Pie } from 'react-chartjs-2';

import './PieChart.css';


function PieChart({ argsObject }) {
    let { dataObj, dataField, labelField, pieArgs, backgroundColor = null, seasonSelect = false } = argsObject;
    let { decSeason, getCurHistoryPeriod } = pieArgs;

    const [pieSeason, setPieSeason] = useState({ year: 2025, seasonEnc: 2 });
    const [curPieSeasonData, setCurPieSeasonData] = useState(null);
    const [curLabels, setCurLabels] = useState(null);

    // initialize pieSeason to the current period
    useEffect(() => {
        setPieSeason(getCurHistoryPeriod())
    }, [])


    // filter the data whenever pieSeason changes
    useEffect(() => {
        if (seasonSelect) {
            let filteredData = dataObj.filter(obj => {
                return (obj.year === pieSeason.year) && (obj.seasonEnc === pieSeason.seasonEnc)
            })

            let newData = filteredData.map(obj => obj[`${dataField}`])
            let newLabels = filteredData.map(obj => obj[`${labelField}`])
            setCurPieSeasonData(newData)
            setCurLabels(newLabels);
        } else {
            // just directly map the object's fields to the chart data
            let newData = dataObj.map(obj => obj[`${dataField}`])
            let newLabels = dataObj.map(obj => obj[`${labelField}`])
            setCurPieSeasonData(newData);
            setCurLabels(newLabels);
        }
    }, [pieSeason])


    let defaultColors = ["rgb(54, 162, 235)", "rgb(255, 99, 132)",
        "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)",
        "rgb(153, 102, 255)", "rgb(201, 203, 207)"
    ];

    function leftArrowClick(pieSeason) {
        if (pieSeason.seasonEnc === 0) {
            setPieSeason(old => ({ ...old, year: old.year - 1, seasonEnc: 2 }))
        } else {
            setPieSeason(old => ({ ...old, year: old.year, seasonEnc: old.seasonEnc - 1 }))
        }
    }

    function rightArrowClick(pieSeason) {
        if (pieSeason.seasonEnc === 2) {
            setPieSeason(old => ({ ...old, year: old.year + 1, seasonEnc: 0 }))
        } else {
            setPieSeason(old => ({ ...old, year: old.year, seasonEnc: old.seasonEnc + 1 }))
        }
    }

    return (<>
        <>
            <Pie
                data={{
                    labels: curLabels,
                    datasets: [
                        {
                            data: curPieSeasonData,
                            backgroundColor: backgroundColor ?? defaultColors,
                            borderColor: '#000',
                            borderWidth: 0.5
                        },
                        { data: [] }
                    ],
                }}
                options={{
                    maintainAspectRatio: false,
                    resize: true,
                    plugins: {
                        legend: {
                            position: 'right',
                        },
                    },
                }}
            />
        </>

        {seasonSelect && <div className="season-select-wrapper">
            <div className="season-select">
                <div className='arrow-btn left' onClick={() => leftArrowClick(pieSeason)}>&lt;</div>
                <div style={{ minWidth: "100px", maxWidth: '500px' }}> {`${decSeason(pieSeason.seasonEnc)} ${pieSeason.year}`} </div>
                <div className='arrow-btn right' onClick={() => rightArrowClick(pieSeason)}>&gt;</div>
            </div>
        </div>}
    </>
    );
}


export default PieChart;