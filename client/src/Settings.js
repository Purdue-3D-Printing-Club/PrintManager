import React from 'react';
import './Settings.css';

function Settings({sidebarWidth, adminPswd, handlePswdChange, isAdmin, checkPswd, feedbackText, handleFeedbackTextChange, feedbackSubject,
                handleFeedbackSubjectChange, handleFeedbackClick}) {
    

    return (
        <div className='settings' style={{
        left: `calc(${sidebarWidth}px + (100% - ${sidebarWidth}px) / 8)`, width: `calc((100% - ${sidebarWidth}px)*0.75)`}}>
        <div className='content-wrapper'>
        <div style={{ height: '75px'}}></div>

        <div className='settings-wrapper'>
                <div  style={{ fontSize:'x-large', marginBottom:'5px'}}>Admin Login</div>
                <input id="adminInput" type="text" placeholder=" Enter Admin Password..." value={adminPswd} onChange={handlePswdChange} style={{width:'250px', fontSize:'large'}}></input> &nbsp;
                <button onClick={()=>{checkPswd(adminPswd, process.env.REACT_APP_ADMIN_PSWD)}} style={{fontSize:'large', cursor:'pointer'}}>Login</button>
        </div>
        
        <div className='settings-wrapper'>
            <div  style={{ fontSize:'x-large', marginBottom:'2px'}}>Hotkeys</div>
            <div className='wrapper-wrapper'>
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

        <div className='settings-wrapper'>
            <div  style={{ fontSize:'x-large', marginBottom:'2px'}}>Feedback Drop-box</div>
            <div  style={{ fontSize:'medium', marginBottom:'10px', color:'gray'}}>(Problems or suggestions,  emailed to Andrew Thompson)</div>            
            <input id="subjectInput" type="text" placeholder=" Enter Email Subject..." value={feedbackSubject}
             onChange={handleFeedbackSubjectChange} style={{width:'500px', fontSize:'large', marginBottom:'3px'}}/>
            <textarea id="feedbackInput" placeholder=" Enter Feedback Here..." value={feedbackText} type="text"
             onChange={handleFeedbackTextChange} style={{ fontFamily:'arial', width: '500px', height: '120px', fontSize: 'large', resize: 'none' }}/>
            <br/>
            <button onClick={()=>{handleFeedbackClick()}} style={{fontSize:'large', marginTop:'5px', cursor:'pointer'}}>Send Feedback</button>
        </div>
        <div style={{ height: '100px' }}></div>
        <div className='settings-header'>Settings</div>
        </div>
        </div>
    );
}

export default Settings;