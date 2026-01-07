import React, { useEffect, useState } from 'react';
import Axios from 'axios';

import './Settings.css';
import eye from '/images/eye.svg';
import eyeSlash from '/images/eye_slash.svg'
import serverIcon from '/images/server.svg';
import groupIcon from '/images/group.svg';
import filamentSpool from '/images/filament_spool.svg';
import linkIcon from '/images/link.svg';
import addUser from '/images/add_user.svg';
import searchIcon from '/images/search.svg'
import sortIcon from '/images/sort.svg'
import exitIcon from '/images/cancel.svg';
import dollarIcon from '/images/dollar.svg';
import homeIcon from '/images/home.svg'


import discord_qr from '/images/3dpc_discord.png'

function Settings({ settingsArgs }) {
  let { adminPswd, handlePswdChange, isAdmin, checkPswd, feedbackText, handleFeedbackTextChange, feedbackSubject,
    handleFeedbackSubjectChange, handleFeedbackClick, handleIsAdminChange, serverURL, setServerURL, menuOpen, handleOpenMenu,
    memberList, setMemberList, truncateStringWidth, formatDate, truncateString, showMsgForDuration, setOrganizerLinks,
    FormCheckbox, generalSettings, setGeneralSettings, filamentSettings, setFilamentSettings,
    getCurHistoryPeriod, decSeason, endSeason, leftArrowClick, rightArrowClick, applyHighlight, ScrollCell
  } = settingsArgs

  const [loginTextVisible, setLoginTextVisible] = useState(false);
  const [tempServerURL, setTempServerURL] = useState(serverURL);

  const [tempLocalData, setTempLocalData] = useState({});

  // member list data
  const [editingMember, setEditingMember] = useState({});
  const [insertMember, setInsertMember] = useState({});
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSort, setMemberSort] = useState('Email');
  const [sortAscending, setSortAscending] = useState(false);
  const [memberPagesShowing, setMemberPagesShowing] = useState(1);
  const [memberSeason, setMemberSeason] = useState({ ...endSeason });
  const [viewingMemberList, setViewingMemberList] = useState(memberList);
  const [isEndSeason, setIsEndSeason] = useState(true);



  let endSeasonText = decSeason(endSeason.seasonEnc)

  const organizerLinksFields = [
    { key: "websiteURL", label: "Website:", placeholder: " Server URL" },
    { key: "formURL", label: "Job Form:", placeholder: " Form URL" },
    { key: "submissionsURL", label: "Form Submissions:", placeholder: " Submissions URL" },
    { key: "mainAppScriptURL", label: "Main App Script:", placeholder: " Main App Script URL" },
    { key: "specialtyAppScriptURL", label: "Specialty App Script:", placeholder: " Specialty App Script URL" },
  ];

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  })

  // update  the viewingMemberList whenever memberSeason changes
  useEffect(() => {
    refreshMembers();
    setIsEndSeason((memberSeason.year === endSeason.year) && (memberSeason.seasonEnc === endSeason.seasonEnc));
    setMemberPagesShowing(1);
  }, [memberSeason])


  const toTime = (s) => {
    if (!s) return -Infinity;
    const iso = s.replace(' ', 'T') + 'Z';
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : -Infinity;
  };


  const handleKeyPress = (e) => {
    const isInputFocused =
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA';
    if (isInputFocused && (e.key === 'Enter')) {
      if (generalSettings?.debugMode) (e.target)
      if (e.target.id === 'edit') {
        handleEditClick(editingMember);
      } else if (e.target.id === 'insert') {
        handleMemberInsertClick(insertMember);
      }
    }
  }


  // // Highlight the search in the job's fields by wrapping it with <b>
  // const applyHighlight = (text, queue, pixelWidth = 400) => {
  //   const truncatedText = truncateStringWidth(text, pixelWidth);

  //   if (!text || !memberSearch || queue) return truncatedText;

  //   const escapedSearch = memberSearch.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
  //   const regex = new RegExp(escapedSearch, 'gi');

  //   // Replace the search term with a highlight html tag around the matched text
  //   return truncatedText.replace(regex, (match) => {
  //     return `<span style="
  //       background-color: rgba(40,200,40,0.4);
  //       border-radius: 2px;
  //     ">${match}</span>`;
  //   });
  // };


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


  useEffect(() => {
    setViewingMemberList(sortMemberList(viewingMemberList, memberSort))
  }, [memberSort, sortAscending, menuOpen])


  const sortMemberList = (list, by = 'Last Updated') => {
    const arr = Array.isArray(list) ? [...list] : [];

    let sortedMembers = []
    if (by === 'Name') {
      sortedMembers = arr.sort((a, b) => {
        return sortAscending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      });
    } else if (by === 'Email') {
      sortedMembers = arr.sort((a, b) => {
        return sortAscending ? a.email.localeCompare(b.email) : b.email.localeCompare(a.email);
      });
    } else if (by === 'Discord Username') {
      sortedMembers = arr.sort((a, b) => {
        return sortAscending ? a.discordUsername.localeCompare(b.discordUsername) : b.discordUsername.localeCompare(a.discordUsername);
      });
    } else { // Last Updated
      return arr.sort((a, b) => {
        const t1 = toTime(a.lastUpdated);
        const t2 = toTime(b.lastUpdated);
        return sortAscending ? t1 - t2 : t2 - t1;
      });
    }
    return sortedMembers
  }


  const handleMemberInsertClick = (member) => {
    if (memberCleanForInsert(member)) {
      memberInsert(member);
    }
  }

  const memberCleanForInsert = (member) => {
    if (memberList.map(mem => { if (mem.memberID === member.memberID) return null; return mem.email }).includes(member.email)) {
      showMsgForDuration(`Cannot insert member: Email already exists!`, 'err');
      return false;
    } else if (!member.email || (!member.email.includes('@purdue.edu'))) {
      showMsgForDuration(`Cannot insert member: Email absent / malformed!`, 'err');
      return false;
    } else if (!member.name) {
      showMsgForDuration(`Cannot insert member: Name absent!`, 'err');
      return false;
    }
    return true;
  }

  const handleMemberSearch = (e) => {
    const newSearch = e.target.value
    setMemberSearch(newSearch);
    if (generalSettings?.debugMode) console.log("Set memberSearch to " + newSearch);
  }

  const memberInsert = (member) => {
    Axios.post(`${serverURL}/api/insertMember`, {
      lastUpdated: new Date().toISOString(),
      name: truncateString(member.name, 128),
      email: truncateString(member.email, 64),
      discordUsername: truncateString(member.discordUsername, 128),
      season: endSeasonText,
      year: endSeason.year
    }).then(() => {
      refreshMembers();
      setInsertMember({
        email: '', name: '', discordUsername: '', seasonEnc: endSeason.seasonEnc,
        year: endSeason.year, lastUpdated: '', memberID: -1
      });
      showMsgForDuration("New Member Inserted!", 'msg');
    });
  }

  const handleDeleteMember = (memberID) => {
    fetch(`${serverURL}/api/deleteMember/${memberID}`, { method: 'DELETE', }).then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }).then(data => {
      refreshMembers();
      if (generalSettings?.debugMode) console.log('Deleted member with id ' + memberID);
    }).catch(error => {
      console.error('Error:', error);
    });
  }

  const handleMemberEdit = (e, field, insert) => {
    const newVal = e.target.value
    if (insert) {
      setInsertMember({ ...insertMember, [field]: newVal });
    } else {
      setEditingMember({ ...editingMember, [field]: newVal });
    }
    if (generalSettings?.debugMode) console.log("Edited member " + field + " to " + newVal);
  }

  const refreshMembers = () => {
    try {
      let query = `SELECT * FROM member WHERE season = "${decSeason(memberSeason.seasonEnc)}" AND year = ${memberSeason.year}`
      if (memberSeason.year === -1) {
        query = `SELECT * FROM member`
      }

      Axios.get(`${serverURL}/api/get?query=${query}`).then((response) => {
        let members = response?.data?.result
        if (generalSettings?.debugMode) console.log('viewing member list: ', members);

        setViewingMemberList(sortMemberList(members, memberSort));
        if (isEndSeason) {
          setMemberList(sortMemberList(members, memberSort));
        }
      }).catch(e => {
        console.error('Error in fetching viewing member list: ', e)
      });
    } catch (error) {
      console.error("Error fetching viewing member list: ", error);
    }

    // let query = `SELECT * FROM member WHERE season = "${endSeasonText}" AND year = ${endSeason.year}`
    // Axios.get(`${serverURL}/api/get?query=${query}`).then((response) => {

    //   setMemberList(sortMemberList(response.data.result, memberSort));
    // });
  }

  const handleEditClick = (member) => {
    const editingMemberFilt = {
      memberID: editingMember.memberID,
      email: truncateString(editingMember.email, 64),
      name: truncateString(editingMember.name, 128),
      discordUsername: truncateString(editingMember.discordUsername, 128),
    }

    // save the edits
    if (editingMemberFilt.memberID === member.memberID) {
      if (memberCleanForInsert(member)) {
        //save the member in the database
        try {
          // let nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ')
          Axios.put(`${serverURL}/api/updateMember`, { ...editingMember, lastUpdated: new Date().toISOString() }).then(() => {
            const newEditingMember = { ...editingMember, memberID: -1 }
            setEditingMember(newEditingMember);
            refreshMembers();
            if (generalSettings?.debugMode) console.log('Saved member in member table');
          });
        } catch (error) {
          console.error("Error updating member: ", error);
        }
      }
    } else {
      // change the member to edit, discard previous changes
      setEditingMember(member);
      if (generalSettings?.debugMode) console.log('Editing member: ', member);
    }
  }

  useEffect(() => {
    try {
      // get the most recent localData from disk to initialize the settings
      Axios.get(`${serverURL}/api/getLocalData`).then((response) => {
        let llocalData = response.data
        if (Object.keys(llocalData).length == 0) {
          llocalData = Object.keys(localData).reduce((acc, key) => {
            acc[key] = 0;
            return acc;
          }, {});
        }
        if (generalSettings?.debugMode) console.log('got localData from disk:', response.data)
        setTempLocalData(llocalData)
      });
    } catch (e) {
      console.error('error in initializing localData: ', e.toString())
    }
  }, [menuOpen])

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

        {/* Admin-only settings */}
        {isAdmin && <div className='settings-wrapper'>
          <div style={{ fontSize: 'x-large' }}><b>Admin-Only Settings</b></div>
          <div style={{ fontSize: 'large', color: 'gray', marginBottom: '15px' }}><b>Proceed With Caution</b></div>

          {/* Server URL Settings */}
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

        <div className='settings-wrapper'>

          {/* Member List */}
          <span className="input-wrapper" >
            <img src={groupIcon} alt="member-list" className='generic-icon'></img>
            <span className='admin-settings-label' style={{ fontSize: '24px' }}>{`Club Members [${viewingMemberList.length}]`}</span>
          </span><br />

          <div className="input-wrapper" style={{ margin: '0px' }}>
            <div className='arrow-btn' style={isEndSeason ?
              { opacity: '30%', cursor: 'default' } : {}} onClick={() => setMemberSeason({ ...endSeason })}>
              <img src={homeIcon} style={{ width: '18px', height: '18px' }}></img>
            </div>

            <div className='arrow-btn' style={{ paddingLeft: '5px', paddingRight: '5px', borderRadius: '50px', fontSize: '18px' }}
              onClick={() => leftArrowClick(memberSeason, setMemberSeason)}>&lt;</div>

            <span style={{ fontSize: '18px', minWidth: '110px' }}>{memberSeason.year === -1 ? `All Time` :
              `${decSeason(memberSeason.seasonEnc)} ${memberSeason.year}`}</span>

            {memberSeason.year !== -1 ?
              <div className='arrow-btn' style={{ paddingLeft: '5px', paddingRight: '5px', borderRadius: '50px', fontSize: '18px' }}
                onClick={() => rightArrowClick(memberSeason, setMemberSeason)}>&gt;</div> :
              <div style={{ width: '39px' }}></div>
            }
          </div>


          {/* Member list table */}
          <div className="print-history" style={{ 'backgroundColor': '#ddddddff', marginTop: '10px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-evenly', alignItems: 'center', alignItems: 'center' }}>
              <span className="search-bar">
                <img src={searchIcon} className='generic-icon'></img> Search
                <input type="text" value={memberSearch ?? ''} onChange={handleMemberSearch}></input>
                <button style={{ cursor: 'pointer' }} onClick={() => setMemberSearch('')}>Clear</button>
              </span>
              <span className='search-bar'>
                <img src={sortIcon} className='generic-icon'></img> Sort
                <select id="printerSort" value={memberSort} onChange={(e) => setMemberSort(e.target.value)}>
                  <option value="Email">Email</option>
                  <option value="Name">Name</option>
                  <option value="Discord Username">Discord Username</option>
                  <option value="Last Updated">Last Updated</option>
                </select>
                <button style={{ cursor: 'pointer' }} onClick={() => setSortAscending(old => !old)}>{sortAscending ? '↕ Asc.\u00A0\u00A0' : '↕ Desc.'}</button>
              </span>
            </div>

          </div>
          <div style={{ height: 'calc(50vh)' }}>
            <div className='wrapper-wrapper' style={{ height: 'calc(50vh)' }}>
              <table className='hotkeys-wrapper'>
                <thead>
                  <tr>
                    <th></th>
                    {isEndSeason && <th></th>}
                    <th>Email</th>
                    <th>Name</th>
                    <th>Discord Username</th>
                    <th>Season</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row to insert new member */}
                  {(isEndSeason) &&
                    <tr style={{ backgroundColor: '#ffffffff' }}>
                      <td><img src={addUser} className='generic-icon centeredIcon'></img></td>
                      <td> <button onClick={() => { handleMemberInsertClick(insertMember) }} className='history-btn' style={{ 'width': '90%', 'marginLeft': '5%' }}>{'insert'}</button></td>
                      <td><input id='insert' type="text" placeholder="newmember@purdue.edu" className="history-edit" style={{ 'width': '250px' }} value={insertMember.email ?? ''} onChange={(e) => handleMemberEdit(e, "email", true)}></input></td>
                      <td><input id='insert' type="text" placeholder="New Member" className="history-edit" style={{ 'width': '250px' }} value={insertMember.name ?? ''} onChange={(e) => handleMemberEdit(e, "name", true)}></input></td>
                      <td><input id='insert' type="text" placeholder="newmember123" className="history-edit" style={{ 'width': '150px' }} value={insertMember.discordUsername ?? ''} onChange={(e) => handleMemberEdit(e, "discordUsername", true)}></input></td>
                      <td> {`${decSeason(endSeason.seasonEnc)} ${endSeason.year}`} </td>
                      <td> N/A </td>
                    </tr>
                  }
                  {viewingMemberList.slice(0, memberPagesShowing * tempLocalData?.generalSettings?.pageSize).map((member) => {
                    const containsSearch = Object.keys(member).some(key => {
                      let value = member[key]
                      if (key === 'lastUpdated') {
                        value = formatDate(value, true)
                      }
                      return ((typeof value === 'string') && (value.toLowerCase().includes(memberSearch.toLowerCase())))
                    }
                    );
                    if (!containsSearch) {
                      return null;
                    }

                    return <tr className={`table-data-row`} key={member.memberID}>
                      <td><button style={{ 'width': '90%', 'marginLeft': '5%' }} onClick={() => { handleDeleteMember(member.memberID) }} className='history-btn'>delete</button></td>
                      {isEndSeason && <td> <button onClick={() => { handleEditClick(member) }} className='history-btn'>{member.memberID !== editingMember.memberID ? 'edit' : 'save'}</button></td>}
                      {
                        ((editingMember.memberID === member.memberID)) ?
                          <>
                            <td><input id='edit' type="text" className="history-edit" style={{ 'width': '250px' }} value={editingMember.email} onChange={(e) => handleMemberEdit(e, "email")}></input></td>
                            <td><input id='edit' type="text" className="history-edit" style={{ 'width': '250px' }} value={editingMember.name} onChange={(e) => handleMemberEdit(e, "name")}></input></td>
                            <td><input id='edit' type="text" className="history-edit" style={{ 'width': '150px' }} value={editingMember.discordUsername} onChange={(e) => handleMemberEdit(e, "discordUsername")}></input></td>
                          </>
                          :
                          <>
                            <ScrollCell html={applyHighlight(member.email, false, memberSearch)} width={270} />
                            <ScrollCell html={applyHighlight(member.name, false, memberSearch)} width={270} />
                            <ScrollCell html={applyHighlight(member.discordUsername, false, memberSearch)} width={165} />
                          </>
                      }
                      <ScrollCell html={applyHighlight(`${member.season} ${member.year}`, false, memberSearch)} width={125} />
                      <td dangerouslySetInnerHTML={{ __html: applyHighlight(formatDate(member.lastUpdated, true), false, memberSearch) }} />
                    </tr>
                  })}
                  {
                    (viewingMemberList.length > (memberPagesShowing * tempLocalData?.generalSettings?.pageSize)) &&
                    <tr className="history-row completed">
                      {Array.from({ length: 7 }, (_, i) => (
                        <td key={i}><button className="history-page-btn" onClick={() => setMemberPagesShowing(old => old + 1)}>...</button></td>
                      ))}
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

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