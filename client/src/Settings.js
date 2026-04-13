import React, { useEffect, useState } from 'react';
import Axios from 'axios';

import './Settings.css';
import eye from '/images/eye.svg';
import eyeSlash from '/images/eye_slash.svg'
import serverIcon from '/images/server.svg';
import filamentSpool from '/images/filament_spool.svg';
import linkIcon from '/images/link.svg';
import exitIcon from '/images/cancel.svg';
import dollarIcon from '/images/dollar.svg';
import discord_qr from '/images/3dpc_discord.png'

import MemberTable from './MemberTable';

function Settings({ settingsArgs }) {
  let { adminPswd, handlePswdChange, isAdmin, checkPswd, feedbackText, handleFeedbackTextChange, feedbackSubject,
    handleFeedbackSubjectChange, handleFeedbackClick, handleIsAdminChange, serverURL, setServerURL, menuOpen, handleOpenMenu,
    memberList, setMemberList, formatDate, truncateString, showMsgForDuration, setOrganizerLinks,
    FormCheckbox, generalSettings, setGeneralSettings, filamentSettings, setFilamentSettings,
    decSeason, endSeason, leftArrowClick, rightArrowClick, applyHighlight, ScrollCell
  } = settingsArgs

  const [loginTextVisible, setLoginTextVisible] = useState(false);
  const [tempServerURL, setTempServerURL] = useState(serverURL);

  const [tempLocalData, setTempLocalData] = useState({});

  let endSeasonText = decSeason(endSeason.seasonEnc)

  const organizerLinksFields = [
    { key: "websiteURL", label: "Website:", placeholder: " Server URL" },
    { key: "formURL", label: "Job Form:", placeholder: " Form URL" },
    { key: "submissionsURL", label: "Form Submissions:", placeholder: " Submissions URL" },
    { key: "mainAppScriptURL", label: "Main App Script:", placeholder: " Main App Script URL" },
    { key: "specialtyAppScriptURL", label: "Specialty App Script:", placeholder: " Specialty App Script URL" },
  ];

  const isEndSeason = (memberSeason, endSeason) => {
    // console.log('memberSeason: ', memberSeason, ' | endSeason: ', endSeason);
    return (memberSeason.year === endSeason.year) && (memberSeason.seasonEnc === endSeason.seasonEnc);
  }



  const toTime = (s) => {
    if (!s) return -Infinity;
    const iso = s.replace(' ', 'T') + 'Z';
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : -Infinity;
  };



  const saveFilamentSettings = () => {
    setFilamentSettings(tempLocalData?.filamentSettings);

    // Call the server API to save the changes to disk
    Axios.post(`${serverURL}/api/setLocalData`, {
      localData: tempLocalData
    }).then((res) => {
      if (res.data.success) {
        showMsgForDuration(`Saved Filament Settings`, 'msg');
      } else {
        showMsgForDuration(`Error Saving Filament Settings`, 'err');
      }
    }).catch((e) => {
      showMsgForDuration(`Error Saving Filament Settings`, 'err');
    })
  }

  // const handleFilamentChange = (filament, dataField) => {
  //   let cleaned_filament = filament.replace(/[^\d.]/g, '')
  //   setTempLocalData({ ...tempLocalData, filamentSettings: { ...tempLocalData.filamentSettings, [dataField]: cleaned_filament } });
  // }
  const handleGeneralNumericInput = (input, key, settingObj = 'generalSettings') => {
    let cleaned_input = '';
    cleaned_input = input.replace(/[^\d]/g, '')
    setTempLocalData({ ...tempLocalData, [settingObj]: { ...tempLocalData[settingObj], [key]: cleaned_input } });
  }

  const updateOrganizerLink = (field, value) => {
    const updatedLinks = { ...tempLocalData?.organizerLinks, [field]: value };

    setOrganizerLinks(updatedLinks);

    Axios.post(`${serverURL}/api/setLocalData`, {
      localData: { ...tempLocalData, organizerLinks: updatedLinks }
    }).then((res) => {
      if (res.data.success) {
        showMsgForDuration(`Successfully Saved Link.`, 'msg');
      } else {
        showMsgForDuration(`Error Saving Link.`, 'err');
      }
    }).catch((e) => {
      showMsgForDuration(`Error Saving Link.`, 'err');
    })
  }

  const toggleFilePreviews = () => {
    updateGeneralSettings('showFilePreviews', !generalSettings.showFilePreviews);
  }
  const toggleDebugMode = () => {
    updateGeneralSettings('debugMode', !generalSettings.debugMode);
  }

  const updateGeneralSettings = (key, value) => {
    if (generalSettings?.debugMode) console.log('Updating general setting: ', key, ' = ', value);

    //update localData
    Axios.post(`${serverURL}/api/setLocalData`, {
      localData: { ...tempLocalData, generalSettings: { ...tempLocalData?.generalSettings, [key]: value } }
    }).then((res) => {
      if (generalSettings?.debugMode) console.log(res)
      if (res.data.success) {
        showMsgForDuration(`Successfully Updated ${key}`, 'msg');
      } else {
        showMsgForDuration(`Error Updating ${key}`, 'err');
      }
    }).catch(e => {
      showMsgForDuration(`Error Updating ${key}`, 'err');
    })
    setGeneralSettings(old => ({ ...old, [key]: value }));
  }


  const memberTableArgs = {
    toTime, isEndSeason, endSeasonText, memberList, setMemberList,
    leftArrowClick, rightArrowClick, ScrollCell, formatDate,
    applyHighlight, truncateString, menuOpen, endSeason, decSeason,
    tempLocalData, setTempLocalData, serverURL, generalSettings,
    showMsgForDuration
  }

  return (
    <div className='settings'>
      <div className='content-wrapper'>
        <div style={{ height: '75px' }}></div>

        {/* Admin login */}
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
              <input id="adminInput" type="text" autoComplete='off' placeholder=" Enter Admin Password..." value={adminPswd ?? ' '} onChange={handlePswdChange} style={{ width: '250px', fontSize: 'large' }} className={loginTextVisible ? "" : "customMasked"}></input> &nbsp;
              <button onClick={() => { checkPswd(adminPswd, import.meta.env.VITE_ADMIN_PSWD) }} style={{ fontSize: 'large', cursor: 'pointer' }}>Login</button>
            </span>
          </div>
            :
            <div>
              <div style={{ fontSize: 'x-large', marginBottom: '5px' }}><b>Admin Logout</b></div>
              <button onClick={() => { handleIsAdminChange(false) }} style={{ fontSize: 'large', cursor: 'pointer' }}>Logout</button>

            </div>}
        </div>

        {/* Admin-only settings */}
        {isAdmin && <div className='settings-wrapper'>
          <div style={{ fontSize: 'x-large' }}><b>Admin-Only Settings</b></div>
          <div style={{ fontSize: 'large', color: 'gray', marginBottom: '15px' }}><b>Proceed With Caution</b></div>

          {/* Server Settings */}
          <hr style={{ borderTop: '1px solid grey', width: '100%' }} />
          <span className="input-wrapper">
            <img src={serverIcon} alt="server" className='generic-icon'></img>
            <span className='admin-settings-label'>Server Settings</span>
          </span><br />

          {/* <input id="serverURLInput" type="text" placeholder="Server URL" value={serverURL}
            onChange={(e) => setServerURL(e.target.value)} style={{ width: '500px', fontSize: 'large', marginBottom: '3px' }} /> */}
          <span className='input-wrapper'>
            <b>Server URL:</b>&nbsp;&nbsp;
            <input id="URLInput" type="text" autoComplete='off' placeholder=" Server URL" value={tempServerURL ?? ' '}
              onChange={(e) => setTempServerURL(e.target.value)} style={{ width: '250px', fontSize: 'large' }}></input> &nbsp;
            <button onClick={(e) => { setServerURL(tempServerURL) }} style={{ fontSize: 'large', cursor: 'pointer' }}>Update</button>
          </span>

          {/* Filament Stock Settings */}
          <hr style={{ borderTop: '1px solid grey', width: '100%' }} />
          <span className="input-wrapper">
            <img src={filamentSpool} alt="filament" className='generic-icon'></img>
            <span className='admin-settings-label'>Filament Stock</span>
          </span><br />

          <span className='input-wrapper' style={{ height: '25px' }}>
            <b className='input-label'>Lab Filament Stock:</b>&nbsp;&nbsp;
            <input type="text" autoComplete='off' placeholder="In grams" value={tempLocalData?.filamentSettings?.filamentStock ?? 0}
              onChange={(e) => handleGeneralNumericInput(e.target.value, 'filamentStock', 'filamentSettings')} style={{ width: '80px', fontSize: 'large' }}></input>&nbsp;g
            &nbsp; <button onClick={(e) => { saveFilamentSettings() }} style={{ fontSize: 'large', cursor: 'pointer' }}>{'Update'}</button>
          </span><br />

          <span className='input-wrapper' style={{ height: '25px' }}>
            <b className='input-label'>Alert Threshold:</b>&nbsp;&nbsp;
            <input type="text" autoComplete='off' placeholder="In grams" value={tempLocalData?.filamentSettings?.filamentThreshold}
              onChange={(e) => handleGeneralNumericInput(e.target.value, 'filamentThreshold', 'filamentSettings')} style={{ width: '80px', fontSize: 'large' }}></input>&nbsp;g
            &nbsp; <button onClick={(e) => { saveFilamentSettings() }} style={{ fontSize: 'large', cursor: 'pointer' }}>{'Update'}</button>
          </span>

          {/* Filament Costs */}
          <hr style={{ borderTop: '1px solid grey', width: '100%' }} />
          <span className="input-wrapper">
            <img src={dollarIcon} alt="links" className='generic-icon'></img>
            <span className='admin-settings-label'>Filament Costs</span>
          </span><br />

          <span className='input-wrapper' style={{ height: '25px' }}>
            <b className='input-label'>Resin Cost:</b>&nbsp;&nbsp;$
            <input type="text" autoComplete='off' value={tempLocalData?.filamentSettings?.resinCost ?? 0.0}
              onChange={(e) => handleGeneralNumericInput(e.target.value, 'resinCost', 'filamentSettings')} style={{ width: '80px', fontSize: 'large' }}></input>/ml&nbsp;
            &nbsp; <button onClick={(e) => { saveFilamentSettings() }} style={{ fontSize: 'large', cursor: 'pointer' }}>{'Update'}</button>
          </span><br />

          <span className='input-wrapper' style={{ height: '25px' }}>
            <b className='input-label'>FDM Cost:</b>&nbsp;&nbsp;$
            <input type="text" autoComplete='off' value={tempLocalData?.filamentSettings?.fdmCost}
              onChange={(e) => handleGeneralNumericInput(e.target.value, 'fdmCost', 'filamentSettings')} style={{ width: '80px', fontSize: 'large' }}></input>/g&nbsp;
            &nbsp; <button onClick={(e) => { saveFilamentSettings() }} style={{ fontSize: 'large', cursor: 'pointer' }}>{'Update'}</button>
          </span>



          {/* Organizer Links */}
          <hr style={{ borderTop: '1px solid grey', width: '100%' }} />
          <span className="input-wrapper">
            <img src={linkIcon} alt="links" className='generic-icon'></img>
            <span className='admin-settings-label'>Organizer Links</span>
          </span><br />

          {organizerLinksFields.map(({ key, label, placeholder }) => (
            <span key={key} className="input-wrapper">
              <b style={{ width: '180px', textAlign: 'right' }}>{label}</b>&nbsp;&nbsp;
              <input
                type="text"
                autoComplete="off"
                placeholder={placeholder}
                value={tempLocalData?.organizerLinks?.[key] ?? ""}
                onChange={(e) =>
                  setTempLocalData(old => ({
                    ...old,
                    organizerLinks: {
                      ...old.organizerLinks,
                      [key]: e.target.value,
                    },
                  }))
                }
                style={{ width: '250px', fontSize: 'large' }}
              />
              &nbsp;
              <button
                onClick={() => updateOrganizerLink(key, tempLocalData?.organizerLinks?.[key])}
                style={{ fontSize: 'large', cursor: 'pointer' }}
              >
                Update
              </button>
            </span>
          ))}
        </div>}
        {/* End admin settings */}

          
        {/* General Settings */}
        <div className='settings-wrapper'>
          <div>
            <div style={{ fontSize: 'x-large', marginBottom: '5px' }}><b>General Settings</b></div>
            <span className='input-wrapper' style={{ height: '25px' }}>
              <b className='input-label'>History Page Size:</b>&nbsp;&nbsp;
              <input type="text" autoComplete='off' placeholder="# of jobs/page" value={tempLocalData?.generalSettings?.pageSize ?? ' '}
                onChange={(e) => handleGeneralNumericInput(e.target.value, 'pageSize', 'generalSettings')} style={{ width: '80px', fontSize: 'large' }}></input>&nbsp;
              &nbsp; <button onClick={(e) => { updateGeneralSettings('pageSize', tempLocalData?.generalSettings?.pageSize) }} style={{ fontSize: 'large', cursor: 'pointer' }}>{'Update'}</button>
            </span><br />

            <FormCheckbox activeCheckVal={generalSettings?.showFilePreviews} handleChangeFunc={toggleFilePreviews} text={"File Previews"}></FormCheckbox>
            <FormCheckbox activeCheckVal={generalSettings?.debugMode} handleChangeFunc={toggleDebugMode} text={"Debug Mode"}></FormCheckbox>
            <br />


          </div>
        </div>

        {/* Member List Table */}
        <MemberTable isClubTable={false} memberTableArgs={memberTableArgs} />

        {/* Club Accounts Table */}
        <MemberTable isClubTable={true} memberTableArgs={memberTableArgs} />



        {/* Hotkey Table */}
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
                <tr><td>&nbsp;↑</td><td>Move up one printer</td></tr>
                <tr><td>&nbsp;↓</td><td>Move down one printer</td></tr>
                <tr><td>Enter</td><td>Start a print</td></tr>
                <tr><td>Backspace</td><td>Exit menu / clear selection</td></tr>
                <tr><td>c</td><td>Clear popups</td></tr>
                <tr><td>s</td><td>Open/close settings</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className='settings-wrapper'>
          <div style={{ fontSize: 'x-large', marginBottom: '2px' }}><b>Feedback Drop-box</b></div>
          <div style={{ fontSize: 'medium', marginBottom: '10px', color: 'gray' }}>(Problems or suggestions,  emailed to print3d@purdue.edu)</div>
          <input id="subjectInput" type="text" placeholder=" Enter Email Subject..." value={feedbackSubject ?? ''}
            onChange={handleFeedbackSubjectChange} style={{ width: '500px', fontSize: 'large', marginBottom: '3px' }} />
          <textarea id="feedbackInput" placeholder=" Enter Feedback Here..." value={feedbackText} type="text"
            onChange={handleFeedbackTextChange} style={{ fontFamily: 'arial', width: '500px', height: '120px', fontSize: 'large', resize: 'none' }} />
          <br />
          <button onClick={() => { handleFeedbackClick() }} style={{ fontSize: 'large', marginTop: '5px', cursor: 'pointer' }}>Send Feedback</button>
        </div>

        <div className='qr-wrapper'>
          <h1>3DPC Discord</h1>
          <img src={discord_qr} alt='3DPC Discord QR Code'></img>
        </div>

        <div style={{ height: '100px' }}></div>
      </div>
      <div className='settings-header'><b>Settings</b> <img className='settings-exit' src={exitIcon} onClick={() => handleOpenMenu()}></img></div>
    </div>
  );
}





export default Settings;