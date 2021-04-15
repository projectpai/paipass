import React from 'react';
import FlexView from 'react-flexview';

import './status-indicator.scss';

const StatusIndicator = ({ status, title }) => (
    <FlexView vAlignContent="center">
        <span className={`status-indicator__${status ? 'positive' : 'negative'}`} />
        <strong className="status-indicator__title">{title}</strong>
    </FlexView>
);

export default StatusIndicator;