import React from 'react';
import './Settings.css';

function Menu({ menuOpen, selectedPrinter, handlefiles, files, handleFilamentUsage, filamentUsage, handleStartPrintClick, sidebarWidth}) {

    return (
        <div className='menu' style={{
        left: `calc(${sidebarWidth}px + (100% - ${sidebarWidth}px) / 10)`, width: `calc((100% - ${sidebarWidth}px)*0.8)`}}>
            <div className='grid-wrapper'>

                <div style={{ height: '100px' }}></div>

                Settings and admin login coming soon!

                <div style={{ height: '100px' }}></div>
                <div className='settings-header'>Settings</div>
        </div>
        </div>
    );
}

export default Menu;