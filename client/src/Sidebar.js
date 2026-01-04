import React from 'react';
import './Sidebar.css';

import clubIcon from '/images/favicon.ico'
import settingsIcon from '/images/settings.png'
import sheetsIcon from '/images/sheets_icon.png'
import formIcon from '/images/form_icon.png'


const Sidebar = ({ printerList, handlePrinterClick, selectedPrinter, handleOpenMenu, menuOpen, selectPrinter, width,
    getStatusColor, printerSort, handlePrinterSort, printerRefs, organizerLinks }) => {
    const getPrinterInfo = (printer) => {
        switch (printerSort) {
            case "Printer Model": return printer.model
            // case "Filament Type": return printer.filamentType
            default: return printer.status
        }
    }
    return (
        <div className="sidebar" style={{ width: `${width}px` }}>
            <div className="mask" style={{ width: `${width}px` }}>

                <div className="icons-wrapper">
                    <div className='settings-icon-wrapper' style={menuOpen ? { outline: "4px solid black" } : {}}><img id="settingsIcon" src={settingsIcon} alt="Settings Icon" title="Open Settings" onClick={() => handleOpenMenu()}></img></div>
                    <a target="_blank" rel="noreferrer" href={organizerLinks.websiteURL}><img className='resizeIcon' src={clubIcon} alt="3DPC Icon" title="To 3DPC Website"></img></a>
                    <a target="_blank" rel="noreferrer" href={organizerLinks.formURL}><img className="resizeIcon" src={formIcon} alt="Google forms Icon" title="To Job Form"></img></a>
                    <a target="_blank" rel="noreferrer" href={organizerLinks.submissionsURL}><img className="resizeIcon" src={sheetsIcon} alt="Google sheets Icon" title="To Job Form Submissions"></img></a>
                    {/* old form link: https://docs.google.com/spreadsheets/d/1MmkZDc7zRuepVEo2r84ithNJ6Q01GhMqSWrNzZSzRpQ/edit?gid=701945760#gid=701945760 */}
                </div>

                {/* <div className="sidebtn" style={menuOpen ? { outline: "4px solid black" } : {}} onClick={() => handleOpenMenu()}>
                    {menuOpen ? "Close" : "Settings"}
                </div> */}
            </div>
            <div className="hdr" style={{ width: `${width}px` }}>
                Printer List
                <div style={{ fontSize: 'medium' }}>
                    Sort:&nbsp;
                    <select id="printerSort" value={printerSort} onChange={handlePrinterSort}>
                        <option value="Availability">Availability</option>
                        <option value="Printer Name">Printer Name</option>
                        <option value="Printer Model">Printer Model</option>
                    </select>
                </div>

            </div>
            <div style={{ height: '115px' }}></div>

            <div id='lowerBar'>
                <div className={'sidePrinter'}
                    onClick={() => handlePrinterClick(null)}
                    style={{ backgroundColor: 'rgb(133, 169, 255)' }}> Home </div>
                {printerList.map((printer, index) => {
                    return <div className={`sidePrinter ${(selectedPrinter && (selectedPrinter.printerName === printer.printerName)) ? 'selected' : ''}`}
                        key={index}
                        ref={printerRefs.current[index]}
                        onClick={() => handlePrinterClick(index)}
                        style={{ backgroundColor: getStatusColor(printer.status) }}
                    >
                        {printer.printerName} - {printer.status ? "[" + getPrinterInfo(printer) + "]" : "[unknown]"}</div>
                })}
            </div>
        </div>
    );
};
export default Sidebar;
