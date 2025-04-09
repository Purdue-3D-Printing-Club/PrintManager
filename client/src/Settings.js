import React, { useEffect, useState } from 'react';
import Axios from 'axios';

import './Settings.css';
import eye from '/images/eye.svg';
import eyeSlash from '/images/eye_slash.svg'

import discord_qr from '/images/3dpc_discord.png'

function Settings({ adminPswd, handlePswdChange, isAdmin, checkPswd, feedbackText, handleFeedbackTextChange, feedbackSubject,
  handleFeedbackSubjectChange, handleFeedbackClick, handleIsAdminChange, serverURL, setServerURL, menuOpen }) {

  const [loginTextVisible, setLoginTextVisible] = useState(false)
  const [tempServerURL, setTempServerURL] = useState(serverURL)


  const [localData, setLocalData] = useState({ filamentStock: 0, filamentThreshold: 15000 })
  const [tempLocalData, setTempLocalData] = useState(localData)

  const [editingLocalData, setEditingLocalData] = useState([false, false])

  const saveLocalDataEdits = () => {
    setEditingLocalData([false, false])
    setLocalData(tempLocalData)

    // Call the server API to save the changes to disk
    Axios.post(`${serverURL}/api/setLocalData`, {
      localData: tempLocalData
    }).then((res) => {
      console.log(res.data)
    })
  }

  useEffect(() => {
    try {
      // get the most recent localData from disk to initialize the settings
      Axios.get(`${serverURL}/api/getLocalData`).then((response) => {
        let llocalData = response.data
        if(Object.keys(llocalData).length == 0) {
          llocalData = Object.keys(localData).reduce((acc, key) => {
          acc[key] = 0;
          return acc;
        }, {});
      }
        console.log('got localData from disk:', response.data)
        setLocalData(llocalData)
        setTempLocalData(llocalData)
      });
    }catch(e){
      console.log('error in initializing localData: ', e.toString())
    }
   
  }, [menuOpen])

  const handleFilamentChange = (filament, dataField) => {
    let cleaned_filament = filament.replace(/\D/g, '')
    setTempLocalData({ ...tempLocalData, [dataField]: cleaned_filament });
  }


  return (
    <div className='settings'>
      <div className='content-wrapper'>
        <div style={{ height: '75px' }}></div>

        <div className='settings-wrapper'>
          {!isAdmin ? <div>
            <div style={{ fontSize: 'x-large', marginBottom: '5px' }}><b>Admin Login</b></div>
            <span className="input-wrapper">
              <span onClick={() => { setLoginTextVisible(!loginTextVisible) }} >
                {loginTextVisible ?
                  <img src={eye} alt="visible" className='visibility-icon no-select'></img> :
                  <img src={eyeSlash} alt="invisible" className='visibility-icon no-select'></img>
                }
              </span>
              <input id="adminInput" type="text" autoComplete='off' placeholder=" Enter Admin Password..." value={adminPswd} onChange={handlePswdChange} style={{ width: '250px', fontSize: 'large' }} className={loginTextVisible ? "" : "customMasked"}></input> &nbsp;
              <button onClick={() => { checkPswd(adminPswd, import.meta.env.VITE_ADMIN_PSWD) }} style={{ fontSize: 'large', cursor: 'pointer' }}>Login</button>
            </span>
          </div>
            :
            <div>
              <div style={{ fontSize: 'x-large', marginBottom: '5px' }}><b>Admin Logout</b></div>
              <button onClick={() => { handleIsAdminChange(false) }} style={{ fontSize: 'large', cursor: 'pointer' }}>Logout</button>


            </div>}
        </div>
        {/* Admin-only settings isAdmin && */}
        {<div className='settings-wrapper'>
          <div style={{ fontSize: 'x-large' }}><b>Admin-Only Settings</b></div>
          <div style={{ fontSize: 'large', color: 'gray', marginBottom: '15px' }}><b>Proceed With Caution</b></div>

          {/* <input id="serverURLInput" type="text" placeholder="Server URL" value={serverURL}
            onChange={(e) => setServerURL(e.target.value)} style={{ width: '500px', fontSize: 'large', marginBottom: '3px' }} /> */}
          <span className='input-wrapper'>
            <b>Server URL:</b>&nbsp;&nbsp;
            <input id="URLInput" type="text" autoComplete='off' placeholder=" Server URL" value={tempServerURL} onChange={(e) => setTempServerURL(e.target.value)} style={{ width: '250px', fontSize: 'large' }}></input> &nbsp;
            <button onClick={(e) => { setServerURL(tempServerURL) }} style={{ fontSize: 'large', cursor: 'pointer' }}>Update</button>
          </span>
          <br /> <br /> <br />
          <span className='input-wrapper' style={{ height: '25px' }}>
            <b className='input-label'>Lab Filament Stock:</b>&nbsp;&nbsp;
            {editingLocalData[0] ? <><input type="text" autoComplete='off' placeholder="In grams" value={tempLocalData.filamentStock} onChange={(e) => handleFilamentChange(e.target.value, 'filamentStock')} style={{ width: '80px', fontSize: 'large' }}></input>&nbsp;g</> :
              <><p style={{ width: '80px' }}>{parseInt(localData.filamentStock).toLocaleString()}&nbsp;g</p>&nbsp;&nbsp;  </>
            } &nbsp;
            <button onClick={(e) => { editingLocalData[0] ? saveLocalDataEdits() : setEditingLocalData([true, false]) }} style={{ cursor: 'pointer' }}>{editingLocalData[0] ? 'Set' : 'Edit'}</button>
            &nbsp;{editingLocalData[0] && <button onClick={(e) => { setEditingLocalData([false, false]) }} style={{ cursor: 'pointer' }}>{'Cancel'}</button>}
          </span>

          <br />
          <span className='input-wrapper' style={{ height: '30px' }}>
            <b className='input-label'>Filament Threshold:</b>&nbsp;&nbsp;
            {editingLocalData[1] ? <><input type="text" autoComplete='off' placeholder="In grams" value={tempLocalData.filamentThreshold} onChange={(e) => handleFilamentChange(e.target.value, 'filamentThreshold')} style={{ width: '80px', fontSize: 'large' }}></input>&nbsp;g</> :
              <><p style={{ width: '80px' }}>{parseInt(localData.filamentThreshold).toLocaleString()}&nbsp;g</p>&nbsp;&nbsp;  </>
            } &nbsp;
            <button onClick={(e) => { editingLocalData[1] ? saveLocalDataEdits() : setEditingLocalData([false, true]) }} style={{ cursor: 'pointer' }}>{editingLocalData[1] ? 'Set' : 'Edit'}</button>
            &nbsp;{editingLocalData[1] && <button onClick={(e) => { setEditingLocalData([false, false]) }} style={{ cursor: 'pointer' }}>{'Cancel'}</button>}
          </span>
        </div>}

        <div className='settings-wrapper'>
          <div style={{ fontSize: 'x-large', marginBottom: '2px' }}><b>Hotkeys</b></div>
          <div className='hotkeys-wrapper-wrapper'>
            <table className='hotkeys-wrapper'>
              <thead>
                <tr>
                  <th>Hotkey</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>←</td> <td>Move up one printer</td></tr>
                <tr><td>→</td> <td>Move down one printer</td></tr>
                <tr><td>Enter</td> <td>Start a print</td></tr>
                <tr><td>Backspace</td> <td>Exit menu / clear selection</td></tr>
                <tr><td>c</td> <td>Clear popups</td></tr>
                <tr><td>s</td> <td>Open/close settings</td></tr>

              </tbody>
            </table>
          </div>
        </div>

        <div className='qr-wrapper'>
          <h1>3DPC Discord</h1>
          <img src={discord_qr} alt='3DPC Discord QR Code'></img>
        </div>

        <div className='settings-wrapper'>
          <div style={{ fontSize: 'x-large', marginBottom: '2px' }}><b>Feedback Drop-box</b></div>
          <div style={{ fontSize: 'medium', marginBottom: '10px', color: 'gray' }}>(Problems or suggestions,  emailed to print3d@purdue.edu)</div>
          <input id="subjectInput" type="text" placeholder=" Enter Email Subject..." value={feedbackSubject}
            onChange={handleFeedbackSubjectChange} style={{ width: '500px', fontSize: 'large', marginBottom: '3px' }} />
          <textarea id="feedbackInput" placeholder=" Enter Feedback Here..." value={feedbackText} type="text"
            onChange={handleFeedbackTextChange} style={{ fontFamily: 'arial', width: '500px', height: '120px', fontSize: 'large', resize: 'none' }} />
          <br />
          <button onClick={() => { handleFeedbackClick() }} style={{ fontSize: 'large', marginTop: '5px', cursor: 'pointer' }}>Send Feedback</button>
        </div>
        <div style={{ height: '100px' }}></div>
      </div>
      <div className='settings-header'><b>Settings</b></div>
    </div>
  );
}

export default Settings;