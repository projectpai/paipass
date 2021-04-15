import React from 'react';
import FlexView from 'react-flexview';
import { H3 } from '@blueprintjs/core';

import './home.scss';

const Home = () => (
    <FlexView className="home" column>
        <FlexView vAlignContent="top">
            <H3>Welcome to PAI Pass Admin</H3>
        </FlexView>
    </FlexView>
);

export default Home;
