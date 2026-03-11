import React, { useEffect, useState } from 'react';
import Axios from 'axios';

import groupIcon from '/images/group.svg';
import addUser from '/images/add_user.svg';
import searchIcon from '/images/search.svg'
import homeIcon from '/images/home.svg'
import sortIcon from '/images/sort.svg'


function MemberTable({ isClubTable, memberTableArgs }) {
    let { toTime, isEndSeason, endSeasonText, memberList, setMemberList,
        leftArrowClick, rightArrowClick, ScrollCell, formatDate,
        applyHighlight, truncateString, menuOpen, endSeason, decSeason,
        tempLocalData, setTempLocalData, serverURL, generalSettings,
        showMsgForDuration
    } = memberTableArgs;


    // member list data
    const [editingMember, setEditingMember] = useState({});
    const [insertMember, setInsertMember] = useState({});
    const [memberSearch, setMemberSearch] = useState('');
    const [memberSort, setMemberSort] = useState('Email');
    const [sortMemberAscending, setSortMemberAscending] = useState(false);
    const [memberPagesShowing, setMemberPagesShowing] = useState(1);
    const [memberSeason, setMemberSeason] = useState({ ...endSeason });
    const [viewingMemberList, setViewingMemberList] = useState(
        memberList.filter(obj => obj.filamentAllowance === null));
    const [tempMemberSearch, setTempMemberSearch] = useState('');
    const [placeholderMemberSearch, setPlaceholderMemberSearch] = useState('');

    // update  the viewingMemberList whenever memberSeason changes
    useEffect(() => {
        refreshMembers();
        setMemberPagesShowing(1);
    }, [memberSeason])

    // keydown listeners to trigger enter press submission
    // useEffect(() => {
    //     window.addEventListener('keydown', handleKeyPress);

    //     return () => {
    //         window.removeEventListener('keydown', handleKeyPress);
    //     };
    // }, [isClubTable])

    const handleKeyPress = (e) => {
        const isInputFocused =
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA';
        if (isInputFocused && (e.key === 'Enter')) {
            if (generalSettings?.debugMode) (e.target)
            if (e.target.id === 'edit') {
                handleEditClick(editingMember);
            } else if (e.target.id === 'insert') {
                handleMemberInsertClick(insertMember, isClubTable);
            }
        }
    }

    useEffect(() => {
        setViewingMemberList(sortMemberList(viewingMemberList, memberSort))
    }, [memberSort, sortMemberAscending, menuOpen])


    const sortMemberList = (list, by = 'Last Updated') => {
        const arr = Array.isArray(list) ? [...list] : [];

        let sortedMembers = []
        if (by === 'Name') {
            sortedMembers = arr.sort((a, b) => {
                return sortMemberAscending ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            });
        } else if (by === 'Email') {
            sortedMembers = arr.sort((a, b) => {
                return sortMemberAscending ? a.email.localeCompare(b.email) : b.email.localeCompare(a.email);
            });
        } else if (by === 'Discord Username') {
            sortedMembers = arr.sort((a, b) => {
                return sortMemberAscending ? a.discordUsername.localeCompare(b.discordUsername) : b.discordUsername.localeCompare(a.discordUsername);
            });
        } else if (by === 'Filament Allowance') {
            sortedMembers = arr.sort((a, b) => {

                return sortMemberAscending ? a.filamentAllowance - b.filamentAllowance : b.filamentAllowance - a.filamentAllowance;
            });

        } else { // Last Updated
            return arr.sort((a, b) => {
                const t1 = toTime(a.lastUpdated);
                const t2 = toTime(b.lastUpdated);
                return sortMemberAscending ? t1 - t2 : t2 - t1;
            });
        }
        return sortedMembers
    }


    const handleMemberInsertClick = (member, isClubTable) => {
        if (memberCleanForInsert(member, isClubTable)) {
            memberInsert(member, isClubTable);
        }
    }

    function isValidPurdueEmail(email) {
        if (typeof email !== 'string') return false;
        const trimmed = email.trim().toLowerCase();
        const purdueRegex = /^[a-z0-9._%+-]+@purdue\.edu$/i;
        return purdueRegex.test(trimmed);
    }

    function isValidPurdueEmailList(emailList) {
        if (!emailList) return true; // allow empty CC
        const emails = emailList.split(',').map(e => e.trim());
        return emails.length > 0 && emails.every(e => isValidPurdueEmail(e));
    }

    const memberCleanForInsert = (member, isClubTable) => {
        let subjectText = isClubTable ? 'club' : 'member';
        try {
            if (memberList.map(mem => {
                if (mem.memberID == member.memberID) {
                    return null;
                }
                return mem.email
            }).includes(member.email)) {
                showMsgForDuration(`Cannot insert ${subjectText}: Email already exists!`, 'err');
                return false;
            } else if (!isValidPurdueEmail(member.email)) {
                showMsgForDuration(`Cannot insert ${subjectText}: Email absent / malformed!`, 'err');
                return false;
            } else if (isClubTable && !isValidPurdueEmailList(member.ccEmails)) {
                showMsgForDuration(`Cannot insert ${subjectText}: CC emails are absent / malformed!`, 'err');
                return false;
            } else if (!member.name) {
                showMsgForDuration(`Cannot insert ${subjectText}: Name absent!`, 'err');
                return false;
            }
            return true;
        } catch (e) {
            showMsgForDuration(`Error inserting ${subjectText}.`, 'err');
            console.error('Error inserting club: ', e);
            return false;
        }
    }

    const handleMemberSearch = (e) => {
        const newSearch = e.target.value
        setMemberSearch(newSearch);
        if (generalSettings?.debugMode) console.log("Set memberSearch to " + newSearch);
    }

    const memberInsert = (member, isClubTable) => {
        Axios.post(`${serverURL}/api/insertMember`, {
            lastUpdated: new Date().toISOString(),
            name: truncateString(member.name, 128),
            email: truncateString(member.email, 64),
            ccEmails: isClubTable ? member.ccEmails : '',
            discordUsername: truncateString(member.discordUsername, 128),
            season: endSeasonText,
            year: endSeason.year,
            filamentAllowance: isClubTable ? (member.filamentAllowance ?? 0) : null
        }).then(() => {
            refreshMembers();
            setInsertMember({
                email: '', name: '', discordUsername: '', seasonEnc: endSeason.seasonEnc,
                ccEmails: '', year: endSeason.year, lastUpdated: '', memberID: -1, filamentAllowance: null
            });
            showMsgForDuration(`New ${isClubTable ? 'club' : 'member'} added.`, 'msg');
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

    const handleMemberEdit = (e, field, insert, numeric = false) => {
        let newVal = e.target.value
        if (numeric) {
            let newValInt = parseInt(newVal);
            newVal = Number.isNaN(newValInt) ? null : newValInt;
        }

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
            const isEmpty = (value) => {
                return (value === null || value === undefined || Number.isNaN(value));
            }

            Axios.get(`${serverURL}/api/get?query=${query}`).then((response) => {
                let members = response?.data?.result
                if (generalSettings?.debugMode) console.log('viewing member list: ', members);
                let filteredMembers = isClubTable ? members.filter(m => !isEmpty(m.filamentAllowance)) :
                    members.filter(m => isEmpty(m.filamentAllowance));
                setViewingMemberList(sortMemberList(filteredMembers, memberSort));

                // also update the actual memberList if this is the current season
                if (isEndSeason(memberSeason, endSeason)) {
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
        // const editingMemberFilt = {
        //     memberID: editingMember.memberID,
        //     email: truncateString(editingMember.email, 64),
        //     name: truncateString(editingMember.name, 128),
        //     discordUsername: truncateString(editingMember.discordUsername, 128),
        // }

        // save the edits
        if (editingMember.memberID === member.memberID) {
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
        //refresh the members
        refreshMembers();
        try {
            // get the most recent localData from disk to initialize the settings
            Axios.get(`${serverURL}/api/getLocalData`).then((response) => {
                let llocalData = response.data
                if (Object.keys(llocalData).length == 0) {
                    llocalData = Object.keys(llocalData).reduce((acc, key) => {
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



    return (
        <div className='settings-wrapper'>
            <span className="input-wrapper" >
                <img src={groupIcon} alt="member-list" className='generic-icon'></img>
                <span className='admin-settings-label' style={{ fontSize: '24px' }}>{(isClubTable ? `Club Accounts` : `3DPC Members`) + ` [${viewingMemberList.length}]`}</span>
            </span><br />

            <div className="input-wrapper" style={{ margin: '0px' }}>
                <div className='arrow-btn' style={isEndSeason(memberSeason, endSeason) ?
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
                        {/* <input type="text" value={memberSearch ?? ''} onChange={handleMemberSearch}></input>
                <button style={{ cursor: 'pointer' }} onClick={() => setMemberSearch('')}>Clear</button> */}
                        <input id={isClubTable ? "clubSearchEnter" : "memberSearchEnter"} type="text" value={tempMemberSearch}
                            placeholder={placeholderMemberSearch} onChange={(e) => { setTempMemberSearch(e.target.value) }}></input>
                        <button id="memberSearchEnterBtn" style={{ cursor: 'pointer' }} onClick={() => {
                            handleMemberSearch({ target: { value: tempMemberSearch } });
                            setPlaceholderMemberSearch(tempMemberSearch);
                            setTempMemberSearch('');
                        }}>{tempMemberSearch === '' ? 'Clear ' : 'Search'}</button>
                    </span>
                    <span className='search-bar'>
                        <img src={sortIcon} className='generic-icon'></img> Sort
                        <select id="printerSort" value={memberSort} onChange={(e) => setMemberSort(e.target.value)}>
                            <option value="Email">{isClubTable ? "Club Email" : "Email"}</option>
                            <option value="Name">{isClubTable ? "Club Name" : "Name"}</option>
                            {!isClubTable && <option value="Discord Username">Discord Username</option>}
                            <option value="Last Updated">Last Updated</option>
                            {isClubTable && <option value="Filament Allowance">Filament Allowance</option>}
                        </select>
                        <button style={{ cursor: 'pointer' }} onClick={() => setSortMemberAscending(old => !old)}>{sortMemberAscending ? '↕ Asc.\u00A0\u00A0' : '↕ Desc.'}</button>
                    </span>
                </div>
            </div>

            <div style={{ height: 'calc(50vh)' }}>
                <div className='wrapper-wrapper' tabIndex={0} onKeyDown={handleKeyPress} style={{ height: 'calc(50vh)' }}>
                    <table className='hotkeys-wrapper'>
                        <thead>
                            <tr>
                                <th></th>
                                {isEndSeason(memberSeason, endSeason) && <th></th>}
                                {isClubTable ? <>
                                    <th>Purdue Club Email</th>
                                    <th>CC Purdue Emails</th>
                                    <th>Club Name</th>
                                </> :
                                    <>
                                        <th>Purdue Email</th>
                                        <th>Full Name</th>
                                    </>}
                                {!isClubTable && <th>Discord Username</th>}
                                <th>Season</th>
                                <th>Last Updated</th>
                                {isClubTable && <th>Filament Allowance</th>}
                            </tr>
                        </thead>
                        <tbody>

                            {/* Row to insert new member */}
                            {(isEndSeason(memberSeason, endSeason)) && <>
                                {isClubTable ? <tr style={{ backgroundColor: '#ffffffff' }}>
                                    {/* INSERT CLUB ACCOUNT */}
                                    <td><img src={addUser} className='generic-icon centeredIcon'></img></td>
                                    <td><button onClick={() => { handleMemberInsertClick(insertMember, true) }} className='history-btn' style={{ 'width': '90%', 'marginLeft': '5%' }}>{'insert'}</button></td>
                                    <td><input id='insert' type="text" autoComplete='off' placeholder="newclub@purdue.edu" className="history-edit" style={{ 'width': '250px' }}
                                        value={insertMember.email ?? ''} onChange={(e) => handleMemberEdit(e, "email", true)}></input></td>
                                    <td><input id='insert' type="text" autoComplete='off' placeholder="m1@purdue.edu, m2@purdue.edu" className="history-edit" style={{ 'width': '250px' }}
                                        value={insertMember.ccEmails ?? ''} onChange={(e) => handleMemberEdit(e, "ccEmails", true)}></input></td>
                                    <td><input id='insert' type="text" autoComplete='off' placeholder="New Club" className="history-edit" style={{ 'width': '250px' }}
                                        value={insertMember.name ?? ''} onChange={(e) => handleMemberEdit(e, "name", true)}></input></td>
                                    <td> {`${decSeason(endSeason.seasonEnc)} ${endSeason.year}`}</td>
                                    <td> N/A </td>
                                    <td><input id='insert' type="text" autoComplete='off' placeholder="5000" className="history-edit" style={{ 'width': '200px' }}
                                        value={insertMember.filamentAllowance ?? ''} onChange={(e) => handleMemberEdit(e, "filamentAllowance", true, true)}></input></td>
                                </tr> :
                                    <tr style={{ backgroundColor: '#ffffffff' }}>
                                        {/* INSERT MEMBER */}
                                        <td><img src={addUser} className='generic-icon centeredIcon'></img></td>
                                        <td><button onClick={() => { handleMemberInsertClick(insertMember, false) }} className='history-btn' style={{ 'width': '90%', 'marginLeft': '5%' }}>{'insert'}</button></td>
                                        <td><input id='insert' type="text" autoComplete='off' placeholder="newmember@purdue.edu" className="history-edit" style={{ 'width': '250px' }}
                                            value={insertMember.email ?? ''} onChange={(e) => handleMemberEdit(e, "email", true)}></input></td>
                                        <td><input id='insert' type="text" autoComplete='off' placeholder="New Member" className="history-edit" style={{ 'width': '250px' }}
                                            value={insertMember.name ?? ''} onChange={(e) => handleMemberEdit(e, "name", true)}></input></td>
                                        <td><input id='insert' type="text" autoComplete='off' placeholder="newmember123" className="history-edit" style={{ 'width': '150px' }}
                                            value={insertMember.discordUsername ?? ''} onChange={(e) => handleMemberEdit(e, "discordUsername", true)}></input></td>
                                        <td> {`${decSeason(endSeason.seasonEnc)} ${endSeason.year}`} </td>
                                        <td> N/A </td>
                                    </tr>
                                }
                            </>
                            }

                            {viewingMemberList.slice(0, memberPagesShowing * tempLocalData?.generalSettings?.pageSize).map((member) => {
                                // Filter for only members that contain the current search
                                const containsSearch = Object.keys(member).some(key => {
                                    let value = member[key]
                                    if (key === 'lastUpdated') {
                                        value = formatDate(value, true)
                                    } else if (key === 'filamentAllowance') {
                                        value = String(value)
                                    }
                                    return ((typeof value === 'string') && (value.toLowerCase().includes(memberSearch.toLowerCase())))
                                }
                                );
                                if (!containsSearch) {
                                    return null;
                                }

                                return <tr className={`table-data-row`} key={member.memberID}>
                                    <td><button style={{ 'width': '90%', 'marginLeft': '5%' }} onClick={() => { handleDeleteMember(member.memberID) }} className='history-btn'>delete</button></td>
                                    {isEndSeason(memberSeason, endSeason) && <td> <button onClick={() => { handleEditClick(member) }}
                                        className='history-btn'>{member.memberID !== editingMember.memberID ? 'edit' : 'save'}</button></td>}
                                    {
                                        ((editingMember.memberID === member.memberID)) ?
                                            <>
                                                <td><input id='edit' autoComplete='off' type="text" className="history-edit" style={{ 'width': '250px' }}
                                                    value={editingMember.email} onChange={(e) => handleMemberEdit(e, "email")}></input></td>
                                                {isClubTable && <td><input id='edit' autoComplete='off' type="text" className="history-edit" style={{ 'width': '250px' }}
                                                    value={editingMember.ccEmails} onChange={(e) => handleMemberEdit(e, "ccEmails")}></input></td>}
                                                <td><input id='edit' autoComplete='off' type="text" className="history-edit" style={{ 'width': '250px' }}
                                                    value={editingMember.name} onChange={(e) => handleMemberEdit(e, "name")}></input></td>
                                                {!isClubTable && <td><input id='edit' autoComplete='off' type="text" className="history-edit" style={{ 'width': '150px' }}
                                                    value={editingMember.discordUsername} onChange={(e) => handleMemberEdit(e, "discordUsername")}></input></td>}
                                            </>
                                            :
                                            <>
                                                <ScrollCell html={applyHighlight(member.email, false, memberSearch)} width={270} />
                                                {isClubTable &&
                                                    <ScrollCell html={applyHighlight(member.ccEmails, false, memberSearch)} width={270} />
                                                }
                                                <ScrollCell html={applyHighlight(member.name, false, memberSearch)} width={270} />
                                                {!isClubTable &&
                                                    <ScrollCell html={applyHighlight(member.discordUsername, false, memberSearch)} width={165} />
                                                }
                                            </>
                                    }
                                    <ScrollCell html={applyHighlight(`${member.season} ${member.year}`, false, memberSearch)} width={125} />
                                    <td dangerouslySetInnerHTML={{ __html: applyHighlight(formatDate(member.lastUpdated, true), false, memberSearch) }} />
                                    {isClubTable && (((editingMember.memberID === member.memberID)) ?
                                        <td><input id='edit' autoComplete='off' type="text" placeholder="5000" className="history-edit" style={{ 'width': '200px' }} value={editingMember.filamentAllowance ?? ''} onChange={(e) => handleMemberEdit(e, "filamentAllowance", false, true)}></input></td>
                                        :
                                        <ScrollCell html={applyHighlight(((member?.filamentAllowance === null) ||
                                            (Number.isNaN(member?.filamentAllowance))) ? 'Not a club account' : `${member?.filamentAllowance}g`, false, memberSearch)} width={165} />
                                    )}
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
    )

}

export default MemberTable;