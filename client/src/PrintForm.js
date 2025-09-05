import loading from '/images/loading.gif'
import checkCircle from '/images/check-circle.svg'
import warningTriangle from '/images/warning-triangle.svg'


import React, {useEffect, useState} from 'react'

const PrintForm = ({ printFormArgs }) => {
    const { setFormData, pullFormData, formData, truncateString, handlename, name, supervisorPrint, email, handleemail,
        handlesupervisor, partNames, handlePartNames, handleUpload, handleFilamentUsage, selectedPrinter,
        filamentUsage, files, notes, handlenotes, fillFormData, supervisor, handlefiles, formDataLoading,
        filesPlaceholder, memberList, personalFilament } = printFormArgs

        const [isMember, setIsMember] = useState(false);

        useEffect(() => {
            if(memberList && (email !== null)) {
                setIsMember(memberList.map(m=>m.email).includes(email))
            } else {
                console.log('Warning in printForm: memberList or formData undefined')
            }
        }, [email, memberList])

    return (
        <div className='printForm'>
            <button onClick={(e) => formData ? setFormData(null) : pullFormData(e)} style={{ fontSize: 'small', marginBottom: '5px', cursor: 'pointer', }}>{formData ? "Clear Autofill Data Table" : "Retrieve Latest Form Submissions..."}</button>
            {formDataLoading && <img src={loading} alt="loading" style={{ width: "60px", height: "60px", margin: "auto", marginBottom: "15px", marginTop: "10px" }}>
            </img>}
            {formData && <div className="form-data-wrapper">
                <table className="form-data-table">
                    <thead>
                        <tr>
                            <th>Parts</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Supervisor</th>
                            {(selectedPrinter.filamentType !== 'PLA') && <>
                                <th>Material</th>
                                <th>Discord Username</th>
                            </>}
                            <th>Notes</th>
                            <th>Files</th>
                        </tr>
                    </thead>
                    <tbody>
                        {formData.map((job, index) => {
                            return <tr className={`history-row form-data-row`} onClick={() => { fillFormData(index) }} key={index}>
                                <td> {truncateString(job.partNames, 40)} </td>
                                <td> {truncateString(job.name, 20)} </td>
                                <td> {truncateString(job.email, 30)} </td>
                                <td> {truncateString(job.supervisorName, 20)} </td>
                                {(selectedPrinter.filamentType !== 'PLA') && <>
                                    <td> {truncateString(job.filamentType, 20)} </td>
                                    <td> {truncateString(job.supervisorName, 20)} </td>
                                    </>}
                                <td> {truncateString(job.notes, 128)} </td>
                                <td> {truncateString(job.files, 256)} </td>
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
            <div style={{height:'30px'}}> Filament Usage: <input value={filamentUsage} placeholder="12.34" type="text" onChange={handleFilamentUsage} style={{ width: '50px', 'fontSize': 'large' }}></input> {(selectedPrinter.filamentType === 'Resin') ? 'ml' : 'g'}
                {(((selectedPrinter.filamentType !== 'PLA')) || (!isMember && !supervisorPrint && !personalFilament)) && (` → $${(Math.round(filamentUsage) * (selectedPrinter.filamentType === 'Resin' ? 0.12 : 0.1)).toFixed(2)}`)} </div>

            <div style={{ marginTop: '10px' }}> -- Notes (Optional) --
                <br />
                <textarea value={notes} type="text" onChange={handlenotes} style={{ width: '400px', height: '60px', fontSize: 'large', resize: 'none' }}></textarea></div>
        </div>

    )
}
export default PrintForm;
