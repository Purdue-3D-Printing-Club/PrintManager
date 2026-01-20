import React, { useState, useEffect } from 'react'
import { Pie } from 'react-chartjs-2';

import './PieChart.css'

import homeIcon from '/images/home.svg'


function PieChart({ argsObject }) {
    let { dataObj, dataField, labelField, pieArgs, backgroundColor = null, seasonSelect = false } = argsObject;
    let { decSeason, getCurHistoryPeriod, endSeason, leftArrowClick, rightArrowClick } = pieArgs;


    const [pieSeason, setPieSeason] = useState({ year: 2025, seasonEnc: 2 });
    const [numLabels, setNumLabels] = useState(10);
    const [curPieSeasonData, setCurPieSeasonData] = useState(null);
    const [curLabels, setCurLabels] = useState(null);


    let defaultColors = [
        "#F4A6B8",
        "#F6C28B",
        "#F2E394",
        "#BFE3B4",
        "#9ED9C8",
        "#9EC5E5",
        "#B3B7E6",
        "#D2B4E8",
        "#E8A6D3",
        "rgb(201, 203, 207)" // gray for "Other"
    ]


    // initialize pieSeason to the current period
    useEffect(() => {
        setPieSeason(getCurHistoryPeriod())
    }, [])


    // filter the data whenever pieSeason or numLabels changes
    useEffect(() => {
        if (seasonSelect) {
            let filteredData = dataObj;
            if (pieSeason.year !== -1) {
                filteredData = dataObj.filter(obj => {
                    return (obj.year === pieSeason.year) && (obj.seasonEnc === pieSeason.seasonEnc)
                })
            }
            let rankedData = topXWithOther(numLabels - 1, filteredData, labelField, dataField);


            // sort while keeping "Other" at the bottom
            let other = null;
            let sortedData = rankedData.filter(obj => {
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
    }, [pieSeason, numLabels])


    function topXWithOther(x, items, labelField, dataField) {
        const map = new Map();
        let otherValue = 0;

        // // 1. Aggregate by label, extract existing "Other"
        for (const item of items) {
            const label = item[labelField];
            const value = Number(item[dataField]) || 0;

            // if (label === 'Other') {
            //     otherValue += value;
            //     continue;
            // }

            map.set(label, (map.get(label) || 0) + value);
        }

        // 2. Convert to array and sort descending by value
        const sorted = Array.from(map.entries())
            .map(([label, value]) => ({ [labelField]: label, [dataField]: value }))
            .sort((a, b) => b[dataField] - a[dataField]);


        // 3. Take top x and aggregate the rest
        const top = sorted.slice(0, x);
        const rest = sorted.slice(x);

        for (const item of rest) {
            otherValue += item[dataField];
        }

        // 4. Add item prefixes to the top labels
        top.forEach((item, index) => {
            item[labelField] = `${index + 1}. ${item[labelField]}`;
        });

        // 5. Append "Other" if it has data
        if (otherValue > 0) {
            top.push({ [labelField]: 'Other', [dataField]: otherValue });
        }

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
                                    labels: {
                                        boxWidth: 25,
                                        generateLabels(chart) {
                                            const dataset = chart.data.datasets[0];
                                            const labels = chart.data.labels || [];

                                            return labels.slice(0, 10).map((label, i) => ({
                                                text: label,
                                                fillStyle: dataset.backgroundColor[i],
                                                strokeStyle: dataset.borderColor,
                                                lineWidth: dataset.borderWidth,
                                                hidden: !chart.getDataVisibility(i),
                                                index: i,
                                            }));
                                        },
                                    },
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
                <div>
                    <select value={numLabels} onChange={(e) => setNumLabels(e.target.value)}>
                        <option value="1">1</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                        <option value="50">50</option>
                        <option value="-1">All</option>
                    </select>
                </div>

                <div className='arrow-btn' style={((pieSeason.year === endSeason.year) && (pieSeason.seasonEnc === endSeason.seasonEnc)) ?
                    { opacity: '30%', cursor: 'default' } : {}} onClick={() => setPieSeason({ ...endSeason })}>
                    <img src={homeIcon} style={{ width: '18px', height: '18px' }}></img>
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