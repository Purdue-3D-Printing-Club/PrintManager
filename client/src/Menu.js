import React from 'react';
import './Menu.css';

function Menu({menuOpen, filamentList}) {

    return (
        <div className='menu'>
            <div className='grid-wrapper'>
                <div className={`grid-container ${menuOpen ? 'menuOpen' : ''}`}>
                    
                </div>
            </div>

        </div>
    );
}

export default Menu;