import React, { useState, useEffect } from 'react'
import { Pie } from 'react-chartjs-2';

import './PieChart.css'

import homeIcon from '/images/home.svg'


function PieChart({ argsObject }) {
    let { dataObj, dataField, labelField, pieArgs, backgroundColor = null, seasonSelect = false } = argsObject;
    let { decSeason, getCurHistoryPeriod, endSeason, leftArrowClick, rightArrowClick } = pieArgs;


    const [pieSeason, setPieSeason] = useState({ year: 2025, seasonEnc: 2 });
    const [curPieSeasonData, setCurPieSeasonData] = useState(null);
    const [curLabels, setCurLabels] = useState(null);


    let defaultColors = ["rgb(54, 162, 235)", "rgb(255, 99, 132)",
        "rgb(255, 159, 64)", "rgb(255, 205, 86)", "rgb(75, 192, 192)",
        "rgb(153, 102, 255)", "rgb(201, 203, 207)"
    ];


    // initialize pieSeason to the current period
    useEffect(() => {
        setPieSeason(getCurHistoryPeriod())
    }, [])


    // filter the data whenever pieSeason changes
    useEffect(() => {
        if (seasonSelect) {
            let filteredData = null;
            if (pieSeason.year === -1) {
                // "Total" mode
                // aggregate data field by label field, extract "Other" object if exists, sort by data field, 
                // keep the top 6 labels, add others to the "Other" field, and combine the seven entries.
                filteredData = top6WithOther(dataObj, labelField, dataField);
            } else {
                filteredData = dataObj.filter(obj => {
                    return (obj.year === pieSeason.year) && (obj.seasonEnc === pieSeason.seasonEnc)
                })
            }

            // sort while keeping "Other" at the bottom
            let other = null;
            let sortedData = filteredData.filter(obj => {
                if (obj[labelField] === 'Other') {
                    other = obj;
                    return false;
                }
                return true;
            }).sort((a, b) => {
                const av = Number(a[dataField]) || 0;
                const bv = Number(b[dataField]) || 0;
                return bv - av;
            });
            if (other) {
                sortedData.push(other);
            }


            let newData = sortedData.map(obj => obj[`${dataField}`])
            let newLabels = sortedData.map(obj => obj[`${labelField}`])
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


    function top6WithOther(items, labelField, dataField) {
        const map = new Map();
        let otherValue = 0;

        // 1. Aggregate by label, extract existing "Other"
        for (const item of items) {
            const label = item[labelField];
            const value = Number(item[dataField]) || 0;

            if (label === 'Other') {
                otherValue += value;
                continue;
            }

            map.set(label, (map.get(label) || 0) + value);
        }

        // 2. Convert to array and sort descending by value
        const sorted = Array.from(map.entries())
            .map(([label, value]) => ({ [labelField]: label, [dataField]: value }))
            .sort((a, b) => b.value - a.value);

        // 3. Take top 6 and aggregate the rest
        const top = sorted.slice(0, 6);
        const rest = sorted.slice(6);

        for (const item of rest) {
            otherValue += item[dataField];
        }

        // 4. Append "Other" if it has data
        if (otherValue > 0) {
            top.push({ [labelField]: 'Other', [dataField]: otherValue });
        }

        // console.log('top: ', top)
        return top;
    }

    return (<>
        {
            curPieSeasonData?.length > 0 ?
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
                </> :
                <>
                    <div>
                        No data to show!
                    </div>
                </>
        }


        {seasonSelect && <div className="season-select-wrapper">
            <div className="season-select">
                <div className='arrow-btn' style={((pieSeason.year === endSeason.year) && (pieSeason.seasonEnc === endSeason.seasonEnc)) ? 
                    {opacity:'30%', cursor:'default'} : {}} onClick={() => setPieSeason({...endSeason})}>
                    <img src={homeIcon} style={{width:'18px', height:'18px'}}></img>
                </div>

                <div className='arrow-btn' style={{ paddingLeft: '5px', paddingRight: '5px', borderRadius: '50px', fontSize: '18px' }}
                    onClick={() => leftArrowClick(pieSeason, setPieSeason)}>&lt;</div>
                <div style={{ minWidth: "100px", maxWidth: '500px' }}> {(pieSeason.year === -1) ?
                    'All Time Total' :
                    `${decSeason(pieSeason.seasonEnc)} ${pieSeason.year}`
                }
                </div>
                {pieSeason.year !== -1 ?
                    <div className='arrow-btn' style={{ paddingLeft: '5px', paddingRight: '5px', borderRadius: '50px', fontSize: '18px' }}
                        onClick={() => rightArrowClick(pieSeason, setPieSeason)}>&gt;</div> :
                    <div style={{ width: '39px' }}></div>
                }
            </div>
        </div>}
    </>
    );
}


export default PieChart;