import React from 'react';
import { Tabs } from '@blueprintjs/core';

import './tabs.scss';

const TabsOverride = (props) => (
    <Tabs className="pai-tabs" {...props}>{props.children}</Tabs>
);

export default TabsOverride;
