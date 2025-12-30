import loading from '/images/loading.gif'
import checkCircle from '/images/check-circle.svg'
import warningTriangle from '/images/warning-triangle.svg'


import React, {useEffect, useState} from 'react'

const PrintForm = ({ printFormArgs }) => {
    const { setFormData, pullFormData, formData, truncateString, handlename, name, supervisorPrint, email, handleemail,
        handlesupervisor, partNames, handlePartNames, handleUpload, handleFilamentUsage, selectedPrinter,
        filamentUsage, files, notes, handlenotes, fillFormData, supervisor, handlefiles, formDataLoading,
        filesPlaceholder, memberList, personalFilament, color, handleColor, layerHeight, handleLayerHeight,
        cureTime, handleCureTime, filamentSettings, material, handleMaterial } = printFormArgs

    const ScrollCell = ({ html, width = null }) => (
        <td style={{ padding: 0 }}>
            <div className = "scrollcell" style={{width: width ? width + 'px' : '100%'}} dangerouslySetInnerHTML={{ __html: html }}/>
        </td>
        );

        const [isMember, setIsMember] = useState(false);

        useEffect(() => {
            if(memberList && (email !== null)) {
                setIsMember(memberList.map(m=>m.email.toLowerCase()).includes(email.toLowerCase()))
            } else {
                console.log('Warning in printForm: memberList or formData undefined')
            }
        }, [email, memberList])

    // format an ISO string as mm/dd hh:mm
    function formatTimestamp(ts) {
        const date = new Date(ts); // parse the ISO string
        const pad = n => n.toString().padStart(2, '0');

        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        let hours = pad(date.getHours());
        const suffix = hours >= 12 ? 'PM' : 'AM';
        hours = (hours % 12) || 12;
        const minutes = pad(date.getMinutes());


        return `${month}/${day} ${hours}:${minutes} ${suffix}`;
    }

    return (
        <div className='printForm'>
            <button onClick={(e) => formData ? setFormData(null) : pullFormData(e)} style={{ fontSize: 'small', marginBottom: '5px', cursor: 'pointer', }}>{formData ? "Clear Autofill Data Table" : "Retrieve Latest Form Submissions..."}</button>
            {formDataLoading && <img src={loading} alt="loading" style={{ width: "60px", height: "60px", margin: "auto", marginBottom: "15px", marginTop: "10px" }}>
            </img>}
            {formData && <div className="form-data-wrapper">
                <table className="form-data-table">
                    <thead>
                        <tr>
                            <th>Time Submitted</th>
                            <th>Parts</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Supervisor</th>
                            {(selectedPrinter.filamentType !== 'PLA') && <>
                                <th>Material</th>
                                <th>Color</th>
                                <th>Layer Height</th>
                                <th>Self Processing</th>
                                <th>Detailed Processing</th>
                                <th>Cure Time</th>
                            </>}
                            <th>Notes</th>
                            <th>Files</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.map((job, index) => {
                            return <tr className={`history-row form-data-row`} onClick={() => { fillFormData(index) }} key={index}>
                                <td> {formatTimestamp(job.timestamp)} </td>
                                <ScrollCell html={job.partNames} width={250}/>
                                <ScrollCell html={job.name} width={200}/>
                                <ScrollCell html={job.email} width={200}/>
                                <ScrollCell html={job.supervisorName} width={175}/>
                                <ScrollCell html={job.material} width={100}/>
                                
                                {(selectedPrinter.filamentType !== 'PLA') && <>
                                    <ScrollCell html={job.color} width={100}/>
                                    <ScrollCell html={job.layerHeight} width={100}/>
                                    <ScrollCell html={job.selfPostProcess} width={100}/>
                                    <ScrollCell html={job.detailedPostProcess} width={100}/>
                                    <ScrollCell html={job.cureTime} width={100}/>
                                    </>}
                                <ScrollCell html={job.notes} width={320}/>
                                <ScrollCell html={job.files} width={640}/>
                            </tr>
                        })}
                    </tbody>
                </table>
            </div>}
            <div> Name: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <input placeholder="Purdue Pete" value={name} onChange={handlename} style={{ width: '300px', 'fontSize': 'large' }}></input></div>
            <div className={`${supervisorPrint ? 'disabled' : 'enabled'}`}> Email: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span style={{'width':'300px', 'position':'relative'}}>
                <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="pete123@purdue.edu" value={email} onChange={handleemail} style={{ width: '300px', 'fontSize': 'large' }}></input>
                <img src={(isMember | supervisorPrint)?checkCircle:warningTriangle} style={{backgroundColor:'#ffffffcc'}} className='input-icon'  title={isMember ? 'Verified member' : 'Not a member'}></img>
                </span>
            </div>

            <div className={`supervisor-input ${supervisorPrint ? 'disabled' : 'enabled'}`}> Supervisor:&nbsp;&nbsp; <input tabIndex={supervisorPrint ? -1 : undefined} placeholder="Supervisor Name" value={supervisorPrint ? name : supervisor} onChange={handlesupervisor} style={{ width: '300px', 'fontSize': 'large' }}></input></div>
            <input type="file" multiple onChange={handleUpload} style={{ display: 'none' }} id="upload" />
            <div> Parts:&nbsp;
                <button tabIndex="-1" className={`file-upload`} onClick={() => document.getElementById('upload').click()} style={{ fontSize: 'small', marginRight: '2px', marginLeft: '4px' }}>browse...</button>
                <input placeholder="part1, part2" value={partNames} onChange={handlePartNames} style={{ width: '300px', 'fontSize': 'large' }}></input></div>

            <div> Files:&nbsp;&nbsp;
                <button tabIndex="-1" className={`file-upload`} onClick={() => document.getElementById('upload').click()} style={{ fontSize: 'small', marginRight: '2px', marginLeft: '4px' }}>browse...</button>
                <input placeholder={filesPlaceholder} value={files} onChange={handlefiles} style={{ width: '300px', 'fontSize': 'large' }}></input>
            </div>
            
            <div style={{height:'2px'}}></div>
            <div> Material: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <select style={{width:'158px', height:'30px', 'fontSize':'large'}} id="material" value={material} onChange={handleMaterial}>
                        <option value="" disabled hidden>Select Material</option>
                        {selectedPrinter?.material?.split(',').map((material)=>{
                            return <option value={material}>{material}</option>
                        })
                        }
                    </select>
                    </div>
            <div style={{height:'1px'}}></div>

            <div> Color: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <input placeholder="Clear" value={color} onChange={handleColor} style={{ width: '150px', 'fontSize': 'large' }}></input></div>
            <div> Layer Height: <input placeholder="25 μm" value={layerHeight} onChange={handleLayerHeight} style={{ width: '150px', 'fontSize': 'large' }}></input></div>
            <div> Cure Time: &nbsp;&nbsp;&nbsp; <input placeholder="1 minute" value={cureTime} onChange={handleCureTime} style={{ width: '150px', 'fontSize': 'large' }}></input></div>
            <div style={{height:'10px'}}></div>

            <div style={{height:'30px'}}> Filament Usage: <input value={filamentUsage} placeholder="12.34" type="text" onChange={handleFilamentUsage} style={{ width: '50px', 'fontSize': 'large' }}></input> {(selectedPrinter.filamentType === 'Resin') ? 'ml' : 'g'}
                {(((selectedPrinter.filamentType !== 'PLA')) || (!isMember && !supervisorPrint && !personalFilament)) && (` → $${(Math.round(filamentUsage) * 
                    (selectedPrinter.filamentType === 'Resin' ? filamentSettings.resinCost : filamentSettings.fdmCost)).toFixed(2)}`)} </div>

            <div style={{ marginTop: '15px' }}> -- Notes (Optional) --
                <br />
                <textarea value={notes} type="text" onChange={handlenotes} style={{ width: '400px', height: '60px', fontSize: 'large', resize: 'none' }}></textarea>
                </div>
                {(selectedPrinter.filamentType !== 'PLA') && <>
            <br/>
            <div style={{height:'10px'}}></div>
            </>}
            </div>
            
             

    )
}
export default PrintForm;
