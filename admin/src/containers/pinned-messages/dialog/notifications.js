import React, { Fragment } from 'react';
import FlexView from 'react-flexview';
import { Button, Intent } from '@blueprintjs/core';

const Notifications = ({ notifications, onConfirm }) => (
    <Fragment>
        <FlexView marginBottom="24px" marginTop="24px" hAlignContent="center">
            <strong>This feature is not yet implemented...</strong>
        </FlexView>

        <FlexView marginLeft="auto" marginRight="auto" marginTop="8px">
            <Button
                disabled
                intent={Intent.PRIMARY}
                text={notifications ? 'Okay, turn off message': 'Okay, turn on message'} 
                onClick={onConfirm}
            />    
        </FlexView>
    </Fragment>
);

export default Notifications;
