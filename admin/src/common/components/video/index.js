import React from 'react';
import './video.scss';

// TODO rotate within component, add rotate btn to video controls...
const Video = ({ url, rotated }) => (
    <video className={`pai-video ${rotated ? 'mirror' : ''}`}
        src={url}
        controls
    />
);

export default Video;
