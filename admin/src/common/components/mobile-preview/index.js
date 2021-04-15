import React from 'react';

import Iframe from '../iframe';
import iphoneMockup from '../../../assets/images/iphone_mockup.png';
import './mobile-preview.scss';

const MobilePreview = ({ url }) => {
    return (
        <div className="mobile-preview">
            <Iframe className="mobile-preview__iframe" 
                    src={url}
            />
            <img className="mobile-preview__mockup" 
                 src={iphoneMockup} 
                 alt="Mobile Preview"
            />
        </div>
    );
};

export default MobilePreview;
